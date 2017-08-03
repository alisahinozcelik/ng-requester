import { HttpResponse } from "@angular/common/http";

import { IOperator, OperatorBase } from "./operator";
import { Error, Retry, RawResponse } from "../helpers";

export class PostRequest<T, U = T> extends OperatorBase implements IOperator {
	private static ERROR = Symbol("Stopped on Post-Request Operation");

	constructor(
		private modify: (response: RawResponse<T>) => Promise<RawResponse<U>>,
		private retryOnCatch?: () => Promise<any>
	) {
		super();
	}

	public middleware(response: RawResponse<T>): Promise<RawResponse<U>> {
		return this.modify(response)
			.catch(error => {
				if (this.retryOnCatch) {
					throw new Retry(this.retryOnCatch(), error);
				}
				if (!(error instanceof Error)) {
					error = new Error(PostRequest.ERROR, error);
				}
				throw error;
			})
	}
}