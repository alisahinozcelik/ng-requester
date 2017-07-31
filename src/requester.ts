import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams, HttpRequest, HttpEvent, HttpEventType, HttpProgressEvent, HttpResponse } from "@angular/common/http";
import { Observable, Subscription, Subject } from "rxjs";
import { findIndex } from "lodash";

import { Inheritor, Error, Retry, Response } from "./helpers";
import { METHODS, RESPONSE_TYPES, IRequesterOptions, IRequesterOptionsRequired } from "./interfaces";
import { ALL_EVENTS, RequesterEvent, EVENTS, ProcessStartedEvent, InterceptedEvent,
					RestartedEvent, RequestFiredEvent, PassedGuardsEvent, ProcessFinishedEvent,
					OnDownloadEvent, OnUploadEvent, RespondedEvent, CancelledEvent, AbortedEvent } from "./events";
import { OperatorBase, Interceptor, IOperator, Guard, PreRequest, PostRequest } from "./operators";
import { promiseFactoryChainer } from "./utils/promise-chainer";
import { OpenPromise } from "./utils/open-promise";

type TListener = (event: RequesterEvent) => void;

interface IInterceptorMiddlewareValue {
	id: symbol;
	promise: Promise<Error>;
}

@Injectable()
export class Requester<T = any> {

	public static RETRYING_REJECTED = Symbol('Retrying.Rejected');
	public static UNKNOWN_ERROR = Symbol('Unknown.Error');
	public static RESPONSE_OK = Symbol('Response.Ok');
	public static CANCELLED = Symbol('Cancelled');

	protected instance: Requester<T> = null;

	@Inheritor.ArrayCombiner(this)
	private operators: OperatorBase[];

	@Inheritor.MapCombiner(this)
	private listeners: Map<EVENTS, TListener[]>;

	constructor(
		private client: HttpClient
	) {}

	/**
	 * The domain part of request url
	 * Such as "http://google.com", "www.xxx.com", "localhost:4500"
	 */
	@Inheritor.Basic("")
	public host: string;

	/**
	 * The path part of request url
	 * Such as "v2/availableLimit", "users"
	 */
	@Inheritor.Basic("")
	public url: string;

	/**
	 * The method of the request
	 */
	@Inheritor.Basic(METHODS.GET)
	public method: METHODS;

	/**
	 * Request body to send
	 */
	@Inheritor.Basic(null)
	public data: any;

	/**
	 * Request Headers
	 */
	@Inheritor.Basic(new HttpHeaders())
	public headers: HttpHeaders;

	/**
	 * Request Params
	 */
	@Inheritor.Basic(new HttpParams())
	public params: HttpParams;

	/**
	 * Response Type
	 */
	@Inheritor.Basic(RESPONSE_TYPES.json)
	public responseType: RESPONSE_TYPES;

	/**
	 * Send Request
	 */
	public send<U = T>(): Observable<RequesterEvent<U>> {
		const { listeners } = this;
		const processID = Symbol("Requester.Request.Id");

		const mainStream = new Observable<RequesterEvent<U>>(
			subscriber => {
				subscriber.next(new ProcessStartedEvent(processID));
				subscriber.complete();
				return () => {};
			})
			.do(onNext => {
				const event: EVENTS = EVENTS[onNext.constructor.name];
				(listeners.get(event) || []).forEach(handler => {
					handler(onNext);
				});
			});
		
		const interceptorStream = this.interceptorStream<U>(processID);

		// Return Merged Stream
		return mainStream.merge(interceptorStream).share();
	}

	private interceptorStream<U = T>(processID: symbol): Subject<RequesterEvent<U>> {
		const { operators } = this;
		const stream = new Subject<RequesterEvent<U>>();

		// Map Interceptor Promise Factories into Promises
		const interceptors = <Interceptor[]>operators
			.filter(op => op instanceof Interceptor);

		const eternalInterceptors = interceptors
			.filter(op => op.keepSamePromiseOnRetry)
			.map(Requester.mapInterceptor);
		
		const temporaryInterceptors = interceptors
			.filter(op => !op.keepSamePromiseOnRetry);

		// Start Intercepting Progress
		this.interceptorCycle(processID, stream, eternalInterceptors, temporaryInterceptors);
		
		// Return Stream
		return stream;
	}

	private retryableStream<U = T>(processID: symbol): Observable<RequesterEvent<U>> {
		const { operators } = this;

		return new Observable<RequesterEvent<U>>(subscriber => {
			
			Promise.resolve()
				// Guards
				.then(() => {
					const guards = operators
						.filter(op => op instanceof Guard)
						.map((op: Guard) => op.middleware()); 
					return Promise.all(guards);
				})
				// Pre-request Operators
				.then(() => {
					subscriber.next(new PassedGuardsEvent(processID));

					const preRequests = operators
						.filter(op => op instanceof PreRequest)
						.map((op: PreRequest) => op.middleware);

					return promiseFactoryChainer(preRequests, {
						body: this.data,
						headers: this.headers,
						params: this.params,
						responsType: this.responseType
					});
				})
				// Send Actual Request
				.then(options => {
					const promise = new OpenPromise<HttpResponse<U>>();

					const request = new HttpRequest<U>(METHODS[this.method], this.host + '/' + this.url, this.data, {
						headers: this.headers,
						responseType: (RESPONSE_TYPES[this.responseType] as 'arraybuffer'),
						params: this.params
					});

					subscriber.next(new RequestFiredEvent(processID, request));

					const requestSubscription = this.client
						.request(request)
						.filter(Requester.ngRequestFilter)
						.subscribe({
							next: res => {
								switch (res.type) {
									case HttpEventType.DownloadProgress:
										subscriber.next(new OnDownloadEvent(processID, (res as HttpProgressEvent & { type: HttpEventType.DownloadProgress })))
									break;
									case HttpEventType.UploadProgress:
										subscriber.next(new OnUploadEvent(processID, (res as HttpProgressEvent & { type: HttpEventType.UploadProgress })))
									break;
									default:
										subscriber.next(new RespondedEvent(processID, res as HttpResponse<U>));
										promise.resolve(res as HttpResponse<U>);
								}
							},
							error: err => {
								err.body = err.error;
								err.type = HttpEventType.Response;
								subscriber.next(new RespondedEvent(processID, err as HttpResponse<U>));
								promise.resolve(err);
							}
						});

					subscriber.add(() => {
						requestSubscription.unsubscribe();
						subscriber.next(new CancelledEvent(processID));
						promise.reject(new Error(Requester.CANCELLED, null));
					});

					return promise.promise;
				})
				// Post Request Operators
				.then(response => {
					const postRequests = operators
						.filter(op => op instanceof PostRequest)
						.map((op: PostRequest<U>) => op.middleware);
					
					return promiseFactoryChainer(postRequests, new Response(Requester.RESPONSE_OK, response));
				})
				// Map Raw response to parsed body
				.then(response => {
					const parsedResponse: Response<U> = (response as Response<any>);
					parsedResponse.data = response.data.body;
					subscriber.next(new ProcessFinishedEvent(processID, parsedResponse));
					subscriber.complete();
				})
				.catch(err => {
					if (!(err instanceof Error)) {
						err = new Error(Requester.UNKNOWN_ERROR, err);
					}

					if (!(err instanceof Retry)) {
						subscriber.next(new AbortedEvent(processID, err));
						subscriber.next(new ProcessFinishedEvent(processID, err));
					}

					subscriber.error(err);
				});

			return () => {}
		});
	}

	public clone(): Requester<T> {
		return Requester.createInstance(this);
	}

	public addOperator(...operators: IOperator[]): Requester<T> {
		const clone = this.clone();
		clone.operators = operators;
		return clone;
	}

	private interceptorCycle<U = T>(
		processID: symbol,
		stream: Subject<RequesterEvent<U>>,
		eternalInterceptors: IInterceptorMiddlewareValue[],
		temporaryInterceptors: Interceptor[],
		restarterID?: symbol
	): void {

		let retryableSubscription: Subscription;
		let interceptorSubscription: Subscription;

		// Remove the interceptor which restarts the process
		if (restarterID) {
			const index = findIndex(eternalInterceptors, {id: restarterID});
			eternalInterceptors.splice(index, 1);
		}

		const interceptorPromises = [
				...eternalInterceptors,
				...temporaryInterceptors.map(Requester.mapInterceptor)
			].map(op => op.promise);

		const interceptors$ = Observable.fromPromise(Promise.race(interceptorPromises));

		// Pipe Retryable Observable to the main stream
		retryableSubscription = this.retryableStream<U>(processID).subscribe({
			next: val => stream.next(val),
			error: err => {
				if (err instanceof Retry) {
					stream.next(new RestartedEvent(processID));
					err.promise
						.then(() => {
							this.interceptorCycle(processID, stream, eternalInterceptors, temporaryInterceptors);
						})
						.catch(err => {
							stream.error(new Error(Requester.RETRYING_REJECTED, err));
						});
				} else {
					stream.error(err);
				}
			},
			complete: () => {
				interceptorSubscription.unsubscribe();
				stream.complete();
			}
		});

		// Subscribe to interceptors
		interceptorSubscription = interceptors$
			.subscribe({
				next: error => {
					stream.next(new InterceptedEvent(processID, error))
					stream.error(error);
					retryableSubscription.unsubscribe();
				},
				error: (retry: Retry) => {
					stream.next(new InterceptedEvent(processID, retry.error));
					stream.next(new RestartedEvent(processID));
					retryableSubscription.unsubscribe();
					retry.promise
						.then(() => {
							this.interceptorCycle(processID, stream, eternalInterceptors, temporaryInterceptors, retry.data as symbol);
						})
						.catch(err => {
							stream.error(new Error(Requester.RETRYING_REJECTED, err));
						});
				}
			});
	}

	private static mapInterceptor(operator: Interceptor): IInterceptorMiddlewareValue {
		return operator.middleware();
	}

	private static ngRequestFilter<U>(res: HttpEvent<U>): boolean {
		switch (res.type) {
			case HttpEventType.UploadProgress:
			case HttpEventType.DownloadProgress:
			case HttpEventType.Response:
				return true;
			default:
				return false;
		}
	}

	protected static createInstance<T>(instance: Requester<T>): Requester<T> {
		const created = new Requester(instance.client);
		created.instance = instance;
		return created;
	}
}