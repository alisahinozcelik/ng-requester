import { IOperator, OperatorBase } from "./operator";
import { Error, Retry } from "../helpers";

export class Guard extends OperatorBase implements IOperator {
	private static ERROR_TYPE = Symbol("CATCHED_ON_GUARD");

	constructor(
		private verifier: () => Promise<boolean> | boolean,
		private retryOnCatch?: () => Promise<any>
	) {
		super();
	}

	public middleware(): Promise<boolean> {
		let result = this.verifier();

		if (!(result instanceof Promise)) {
			result = Promise.resolve(result);
		}

		return result
			.then(value => {
				if (!value) {
					throw value;
				}
				return !!value;
			})
			.catch(error => {
				if (this.retryOnCatch) {
					throw new Retry(this.retryOnCatch(), error);
				}

				if (!(error instanceof Error)) {
					error = new Error(Guard.ERROR_TYPE, error);
				}
				throw error;
			});
	}
}