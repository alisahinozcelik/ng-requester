import { IOperator, OperatorBase } from "./operator";
import { RequesterError } from "./error";
import { Retry } from "./retry";
import { revertPromise } from "../utils/revert-promise";

export class Interceptor extends OperatorBase implements IOperator {
	private static ERROR = Symbol("INTERCEPTED");

	constructor(
		private interceptOnResolve: () => Promise<void>,
		private retryAfter?: () => Promise<any>
	) {
		super();
	}

	public middleware(): Promise<void> {
		return revertPromise(this.interceptOnResolve()).catch(error => {
			if (!(error instanceof RequesterError)) {
				error = new RequesterError(Interceptor.ERROR, error);
			}
			throw error;
		});
	}
}