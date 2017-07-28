import { noop } from "lodash";

import { IOperator, OperatorBase } from "./operator";
import { Error, Retry } from "../helpers";

export class Interceptor extends OperatorBase implements IOperator {
	private static ERROR = Symbol("INTERCEPTED");
	private static PROMISE_NEVER = new Promise<void>(noop);

	constructor(
		private interceptOnResolve: () => Promise<any>,
		private retryAfter?: () => Promise<any>,
		public keepSamePromiseOnRetry = false
	) {
		super();
	}

	public middleware(): {id: symbol, promise: Promise<Error>} {
		const interceptorId = Symbol('Requester.Interceptor.Id');

		const promise = this.interceptOnResolve()
			.catch(error => {
				console.warn("An error occured during the interceptor promise, (do not reject interceptor promise)", error);
				return Interceptor.PROMISE_NEVER;
			})
			.then<Error, Retry>(val => {
				if (this.retryAfter) {
					throw new Retry(this.retryAfter(), val, this.keepSamePromiseOnRetry ? interceptorId : false);
				}
				if (!(val instanceof Error)) {
					val = new Error(Interceptor.ERROR, val);
				}
				return val;
			});

		return {
			id: interceptorId,
			promise: promise
		};
	}
}