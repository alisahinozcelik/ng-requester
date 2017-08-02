import { noop } from "lodash";

import { IOperator, OperatorBase } from "./operator";
import { Error, Retry } from "../helpers";

type TPromiseFactoryAny = () => Promise<any>;

export class Interceptor extends OperatorBase implements IOperator {
	private static ERROR = Symbol("INTERCEPTED");
	private static PROMISE_NEVER = new Promise<void>(noop);

	constructor(
		private interceptOnResolve: TPromiseFactoryAny,
		public keepRunningOnRetry = false,
		private retryAfter: TPromiseFactoryAny = null
	) {
		super();
	}

	public middleware(): {id: symbol, promise: Promise<Error>} {
		const interceptorId = Symbol('Requester.Interceptor.Id');

		const promise = this.interceptOnResolve()
			.catch(error => {
				return Interceptor.PROMISE_NEVER;
			})
			.then<Error, Retry>(val => {
				if (this.retryAfter) {
					throw new Retry(this.retryAfter(), val, this.keepRunningOnRetry ? interceptorId : false);
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