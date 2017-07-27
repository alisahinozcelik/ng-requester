import { noop } from "lodash";

import { IOperator, OperatorBase } from "./operator";
import { Error } from "../helpers/error";
import { Retry } from "./retry";

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

	public middleware(): Promise<Error> {
		return this.interceptOnResolve()
			.catch(error => {
				console.warn("An error occured during the interceptor promise, (do not reject interceptor promise)", error);
				return Interceptor.PROMISE_NEVER;
			})
			.then<Error, Retry>(val => {
				if (this.retryAfter) {
					throw new Retry(this.retryAfter(), val);
				}
				if (!(val instanceof Error)) {
					val = new Error(Interceptor.ERROR, val);
				}
				return val;
			});
	}
}