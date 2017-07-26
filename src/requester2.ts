import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, Subject } from "rxjs";

import { Inheritor, InheritedArrayCombiner } from "./helpers";
import { METHODS } from "./interfaces";
import { ProcessStartedEvent, RequesterEvent } from "./events";
import { OperatorBase } from "./operators";

@Injectable()
export class Requester<T = any> {
	protected instance: Requester<T> = null;

	@InheritedArrayCombiner()
	private operators: OperatorBase[];

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
		const interceptor$ = new Observable(subscriber => {

		});

		return new Observable<RequesterEvent<U>>(subscriber => {

			const processID = Symbol("Requester.Request.Id");
			subscriber.next(new ProcessStartedEvent(processID));



			return () => {

			};
		}).share();
	}

	private _send<U = T>(): Observable<RequesterEvent<U>> {
		const phase = new Subject<RequesterEvent<U>>();



		return phase;
	}

	public clone(): Requester<T> {
		return Requester.createInstance(this);
	}

	protected static createInstance<T>(instance: Requester<T>): Requester<T> {
		const created = new Requester(instance.client);
		created.instance = instance;
		return created;
	}
}