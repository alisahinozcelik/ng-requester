import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, Subject } from "rxjs";

import { Inheritor, InheritedArrayCombiner, InheritedMapCombiner, Error, Retry } from "./helpers";
import { METHODS } from "./interfaces";
import { ALL_EVENTS, RequesterEvent, EVENTS, ProcessStartedEvent, InterceptedEvent, RestartedEvent } from "./events";
import { OperatorBase, Interceptor, IOperator } from "./operators";

type TListener = (event: RequesterEvent) => void;

@Injectable()
export class Requester<T = any> {
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
		const { listeners, operators } = this;

		// Map Interceptor Promise Factories into Promises 
		const interceptors = <Interceptor[]>operators
			.filter(op => op instanceof Interceptor);

		const eternalInterceptor$ = interceptors
			.filter(op => op.keepSamePromiseOnRetry)
			.map(Requester.mapToMiddleware);
		
		const temporaryInterceptors = interceptors
			.filter(op => !op.keepSamePromiseOnRetry);

		// Create Main Stream
		const mainStream = new Observable<RequesterEvent<U>>(
			subscriber => {
				// Create Process Id
				const processID = Symbol("Requester.Request.Id");

				// Fire Start Event
				subscriber.next(new ProcessStartedEvent(processID));

				// Set Interceptors
				const interceptors$ = Observable.fromPromise(Promise.race([...eternalInterceptor$, ...temporaryInterceptors.map(Requester.mapToMiddleware)]));

				// Subscribe to interceptors
				const interceptorSubscription = interceptors$
					.subscribe({
						next: error => {
							subscriber.next(new InterceptedEvent(processID, error))
							subscriber.error(error);
						},
						error: (retry: Retry) => {
							subscriber.next(new InterceptedEvent(processID, retry.error));
							subscriber.next(new RestartedEvent(processID));
							// retry.then()
						}
					});
				
				const retryablePhase = this._send();

				return () => {
					interceptorSubscription.unsubscribe();
				};
			})
			.share()
			.do(onNext => {
				// Call Event Handlers
				const event: EVENTS = EVENTS[onNext.constructor.name];
				listeners.get(event).forEach(handler => {
					handler(onNext);
				});
			});

		// Return Main Stream
		return mainStream;
	}

	private _send<U = T>(): Observable<RequesterEvent<U>> {
		const phase = new Subject<RequesterEvent<U>>();

		return phase;
	}

	public clone(): Requester<T> {
		return Requester.createInstance(this);
	}

	private static mapToMiddleware(operator: IOperator): Promise<any> {
		return operator.middleware();
	}

	protected static createInstance<T>(instance: Requester<T>): Requester<T> {
		const created = new Requester(instance.client);
		created.instance = instance;
		return created;
	}
}