import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, Subscription, Subject } from "rxjs";
import { findIndex } from "lodash";

import { Inheritor, InheritedArrayCombiner, InheritedMapCombiner, Error, Retry } from "./helpers";
import { METHODS } from "./interfaces";
import { ALL_EVENTS, RequesterEvent, EVENTS, ProcessStartedEvent, InterceptedEvent, RestartedEvent } from "./events";
import { OperatorBase, Interceptor, IOperator } from "./operators";

type TListener = (event: RequesterEvent) => void;

@Injectable()
export class Requester<T = any> {
	public static RETRYING_REJECTED = Symbol('Retrying.Rejected');
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
				return () => {};
			})
			.do(onNext => {
				const event: EVENTS = EVENTS[onNext.constructor.name];
				listeners.get(event).forEach(handler => {
					handler(onNext);
				});
			});
		
		const interceptorStream = this.interceptorStream<U>(processID);

		// Return Merged Stream
		return mainStream.merge(interceptorStream).share();
	}

	private interceptorStream<U = T>(id: symbol): Subject<RequesterEvent<U>> {
		const { operators } = this;
		const stream = new Subject<RequesterEvent<U>>();
		const self = this;

		// Map Interceptor Promise Factories into Promises
		const interceptors = <Interceptor[]>operators
			.filter(op => op instanceof Interceptor);

		const eternalInterceptors = interceptors
			.filter(op => op.keepSamePromiseOnRetry)
			.map(Requester.mapInterceptor);
		
		const temporaryInterceptors = interceptors
			.filter(op => !op.keepSamePromiseOnRetry);

		// Start Intercepting Progress
		startInterceptor();
		
		// Return Stream
		return stream;

		// Cycling Function
		function startInterceptor(restarterId?: symbol) :void {
			let retryableSubscription: Subscription;
			let interceptorSubscription: Subscription;

			// Remove the interceptor which restarts the process
			if (restarterId) {
				const index = findIndex(eternalInterceptors, {id: restarterId});
				eternalInterceptors.splice(index, 1);
			}

			const interceptorPromises = [
					...eternalInterceptors,
					...temporaryInterceptors.map(Requester.mapInterceptor)
				].map(op => op.promise);

			const interceptors$ = Observable.fromPromise(Promise.race(interceptorPromises));

			// Pipe Retryable Observable to the main stream
			retryableSubscription = self.retryableStream<U>(id).subscribe({
				next: val => stream.next(val),
				error: err => stream.error(err),
				complete: () => {
					interceptorSubscription.unsubscribe();
					stream.complete();
				}
			});

			// Subscribe to interceptors
			interceptorSubscription = interceptors$
				.subscribe({
					next: error => {
						stream.next(new InterceptedEvent(id, error))
						stream.error(error);
						retryableSubscription.unsubscribe();
					},
					error: (retry: Retry) => {
						stream.next(new InterceptedEvent(id, retry.error));
						stream.next(new RestartedEvent(id));
						retryableSubscription.unsubscribe();
						retry.promise
							.then(() => {startInterceptor(retry.data as symbol)})
							.catch(err => {
								stream.error(new Error(Requester.RETRYING_REJECTED, err));
							});
					}
				});
		}
	}

	private retryableStream<U = T>(id: symbol): Observable<RequesterEvent<U>> {
		return new Observable();
	}

	public clone(): Requester<T> {
		return Requester.createInstance(this);
	}

	private static mapInterceptor(operator: Interceptor): { id: symbol; promise: Promise<Error> } {
		return operator.middleware();
	}

	protected static createInstance<T>(instance: Requester<T>): Requester<T> {
		const created = new Requester(instance.client);
		created.instance = instance;
		return created;
	}
}