import { IOperator, OperatorBase } from "./operator";
import { RequesterError } from "./error";
import { Retry } from "./retry";

export class PostRequest<T, U = T> extends OperatorBase implements IOperator {
	private static ERROR = Symbol("Stopped on Post-Request Operation");

	constructor(
		private modify: (response: T) => Promise<U>,
		private retryOnCatch?: () => Promise<any>
	) {
		super();
	}

	public middleware(response: T): Promise<U> {
		return this.modify(response)
			.catch(error => {
				if (this.retryOnCatch) {
					throw new Retry(this.retryOnCatch(), error);
				}
				if (!(error instanceof RequesterError)) {
					error = new RequesterError(PostRequest.ERROR, error);
				}
				throw error;
			})
	}
}