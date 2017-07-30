import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, Subscription, Subject } from "rxjs";
import { findIndex } from "lodash";

import { Inheritor, InheritedArrayCombiner, InheritedMapCombiner, Error, Retry, Response } from "./helpers";
import { METHODS } from "./interfaces";
import { ALL_EVENTS, RequesterEvent, EVENTS, ProcessStartedEvent, InterceptedEvent, RestartedEvent, RequestFiredEvent, PassedGuardsEvent, ProcessFinishedEvent } from "./events";
import { OperatorBase, Interceptor, IOperator, Guard } from "./operators";

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

	protected instance: Requester<T> = null;

	@InheritedArrayCombiner()
	private operators: OperatorBase[];

	@InheritedMapCombiner.Decorator(this)
	private listeners: Map<EVENTS, TListener[]>;

	constructor(
		private client: HttpClient
	) {}

	/**
	 * The domain part of request url
	 * Such as "http://google.com", "www.xxx.com", "localhost:4500"
	 */
	@Inheritor("")
	host: string;

	/**
	 * The path part of request url
	 * Such as "v2/availableLimit", "users"
	 */
	@Inheritor("")
	url: string;

	/**
	 * The method of the request
	 */
	@Inheritor(METHODS.GET)
	method: METHODS;

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
			const guards = operators
				.filter(op => op instanceof Guard)
				.map((op: Guard) => op.middleware());
			
			Promise.all(guards)
				.then<Response<U>>(() => {
					subscriber.next(new PassedGuardsEvent(processID));
					return new Response(Requester.RESPONSE_OK, {} as U);
				})
				.then(res => {
					subscriber.next(new ProcessFinishedEvent(processID, res));
					subscriber.complete();
				})
				.catch(err => {
					if (!(err instanceof Error)) {
						err = new Error(Requester.UNKNOWN_ERROR, err);
					}
					subscriber.next(new ProcessFinishedEvent(processID, err));
					subscriber.error(err);
				});

			return () => {

			}
		});
	}

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

	protected static createInstance<T>(instance: Requester<T>): Requester<T> {
		const created = new Requester(instance.client);
		created.instance = instance;
		return created;
	}
}