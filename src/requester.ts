import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams, HttpRequest, HttpEvent, HttpEventType, HttpProgressEvent, HttpResponse, HttpErrorResponse } from "@angular/common/http";
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

import "./customised-observable";
import { R } from "./customised-observable";

type TListener = (event: RequesterEvent) => void;

interface IInterceptorMiddlewareValue {
	id: symbol;
	promise: Promise<Error>;
}

interface IConfigurableProperties {
	method?: METHODS;
	host?: string;
	url?: string;
	responseType?: RESPONSE_TYPES;
}

interface IPreRequestOptions {
	body: any;
	headers: HttpHeaders;
	params: HttpParams;
	responsType: RESPONSE_TYPES;
}

@Injectable()
export class Requester<T = any> {

	public static RETRYING_REJECTED = Symbol('Retrying.Rejected');
	public static UNKNOWN_ERROR = Symbol('Unknown.Error');
	public static RESPONSE_OK = Symbol('Response.Ok');
	public static CANCELLED = Symbol('Cancelled');
	public static NG_ERROR = Symbol('Angular.Http.Error');

	protected instance: Requester<T> = null;

	@Inheritor.ArrayCombiner()
	private operators: OperatorBase[];

	@Inheritor.MapCombiner()
	private listeners: Map<Function, TListener[]>;

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
	public body: any;

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
	 * Request
	 */
	public request<U = T>(method: METHODS, url: string, options: IRequesterOptions = {}): Observable<RequesterEvent<U>> {
		const clone = Requester.createInstance(this);
		const { body, headers, params, responsType } = options;

		if (body) { clone.body = body; }
		if (headers) { clone.headers = headers; }
		if (params) { clone.params = params; }
		if (responsType !== undefined) { clone.responseType = responsType; }

		clone.method = method;
		return clone.send();
	}

	/**
	 * Get Request
	 * @param url Url to send request
	 * @param options Request Options
	 */
	public get<U = T>(url: string, options?: IRequesterOptions): Observable<RequesterEvent<U>> {
		return this.request(METHODS.GET, url, options);
	}

	public post<U = T>(url: string, options?: IRequesterOptions): Observable<RequesterEvent<U>> {
		return this.request(METHODS.POST, url, options);
	}

	/**
	 * Set Configurable Request Options
	 * @param params Pass host, url, method and responseType to configure
	 */
	public set<U = T>(params: IConfigurableProperties): Requester<U> {
		const clone = Requester.createInstance(this);
		const { host, url, method, responseType } = params;

		if (host) { clone.host = host; }
		if (url) { clone.url = url; }
		if (method !== undefined) { clone.method = method; }
		if (responseType !== undefined) { clone.responseType = responseType; }

		return clone;
	}

	/**
	 * Set Headers
	 * @param configurer Pass a configurer function which gets current headers as first argument and should return new headers to set
	 */
	public configureHeaders<U = T>(configurer: (headers: HttpHeaders) => HttpHeaders): Requester<U> {
		const clone = this.clone();
		clone.headers = configurer(clone.headers);
		return clone;
	}

	/**
	 * Set Query String Params
	 * @param configurer Pass a configurer function which gets current params as first argument and should return new params to set
	 */
	public configureParams<U = T>(configurer: (params: HttpParams) => HttpParams): Requester<U> {
		const clone = this.clone();
		clone.params = configurer(clone.params);
		return clone;
	}

	public addOperator<U = T>(...operators: IOperator[]): Requester<U> {
		const clone = this.clone();
		clone.operators = operators;
		return clone;
	}

	/**
	 * Add Event Listener
	 * @param eventClass Pass event class itself (ex: ProcessStartedEvent)
	 * @param listener Callback function to call on each passed event
	 */
	public addListener<U = T>(eventClass: Function, listener: TListener): Requester<U> {
		const clone = this.clone();
		clone.listeners = new Map().set(eventClass, [listener]);
		return clone;
	}

	/**
	 * Send Request
	 */
	public send<U = T>(): R.Observable<RequesterEvent<U>> {
		const { listeners } = this;
		const processID = Symbol("Requester.Request.Id");

		const mainStream = new Observable<RequesterEvent<U>>(
			subscriber => {
				subscriber.next(new ProcessStartedEvent(processID));
				subscriber.complete();
				return () => {};
			})
			.do(onNext => {
				const event = onNext.constructor as typeof RequesterEvent;

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

		return Observable.of(true)
			.flatMap(() => {
				const guards = operators
					.filter(op => op instanceof Guard)
					.map((op: Guard) => op.middleware());
				return Promise.all(guards);
			})
			.map(() => new PassedGuardsEvent(processID))
			.flatMap(val => {
				const preRequests = operators
					.filter(op => op instanceof PreRequest)
					.map((op: PreRequest) => op.middleware);
				
				const preRequests$ = promiseFactoryChainer(preRequests, {
					body: this.body,
					headers: this.headers,
					params: this.params,
					responsType: this.responseType
				});

				return Observable.of(val).merge(preRequests$);
			})
			.flatMap((options: IPreRequestOptions) => {
				if (options instanceof RequesterEvent) {return Observable.of(options);}
				
				const request = new HttpRequest<U>(METHODS[this.method], this.host + '/' + this.url, this.body, {
					headers: this.headers,
					responseType: (RESPONSE_TYPES[this.responseType] as 'arraybuffer'),
					params: this.params
				});

				return this.client.request<U>(request)
					.catch<any, HttpResponse<U>>((err: any) => {
						if (!(err instanceof HttpErrorResponse)) {
							// Until angular fixes this issue write error to the console
							console.error(err);
							return Observable.throw(new Error(Requester.NG_ERROR, err));
						}
						const mapped = new HttpResponse({
							body: err.error,
							headers: err.headers,
							status: err.status,
							statusText: err.statusText,
							url: err.url
						});
						return Observable.of(mapped) as Observable<HttpResponse<U>>;
					})
					.map<HttpEvent<U>, RequesterEvent<U>>(res => {
						switch (res.type) {
							case HttpEventType.Sent:
								return new RequestFiredEvent(processID, request);
							case HttpEventType.DownloadProgress:
								return new OnDownloadEvent(processID, (res as HttpProgressEvent & { type: HttpEventType.DownloadProgress }));
							case HttpEventType.UploadProgress:
								return new OnUploadEvent(processID, (res as HttpProgressEvent & { type: HttpEventType.UploadProgress }));
							case HttpEventType.Response:
								return new RespondedEvent(processID, res as HttpResponse<U>);
							default:
								return null;
						}
					});
			})
			.filter(val => val !== null)
			.flatMap((res: RespondedEvent<U>) => {
				if (res instanceof Error) {
					return Observable.throw(res);
				}
				if (!(res instanceof RespondedEvent)) {
					return Observable.of(res);
				}

				const postRequests = operators
					.filter(op => op instanceof PostRequest)
					.map((op: PostRequest<U>) => op.middleware);
				
				return Observable.of(res).merge(promiseFactoryChainer(postRequests, new Response(Requester.RESPONSE_OK, res.response)))
			})
			.flatMap((value: Response<HttpResponse<U>>) => {
				if (value instanceof RequesterEvent) {return Observable.of(value);}
				return Observable.of(new ProcessFinishedEvent(processID, new Response(value.type, value.data.body)));
			})
			.catch(err => {
				if (!(err instanceof Error)) {
					err = new Error(Requester.UNKNOWN_ERROR, err);
				}

				if (!(err instanceof Retry)) {
					return Observable.of(new AbortedEvent(processID, err), new ProcessFinishedEvent(processID, err))
						.merge(Observable.throw(err));
				}

				return Observable.throw(err);
			});
	}

	/**
	 * Clone Requester
	 */
	public clone(): Requester<T> {
		return Requester.createInstance(this);
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
			next: val => {
				stream.next(val);
			},
			error: err => {
				console.info(err);
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