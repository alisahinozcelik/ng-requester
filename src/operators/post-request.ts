import { HttpResponse } from "@angular/common/http";

import { IOperator, OperatorBase } from "./operator";
import { Error, Retry, RawResponse } from "../helpers";

/**
 * Post Request
 */
export class PostRequest<T, U = T> extends OperatorBase implements IOperator {
	/**
	 * Static Post Request Error Type Symbol
	 * Post Request errors fires Error object with this type, unless a custom error defined
	 */
	public static ERROR = Symbol("PostRequest.Failed");

	/**
	 * @param modify Raw Response Modifier function
	 * gets the response in transaction as first parameter, should return a new RawResponse or RawResponse Promise
	 * @param retryOnCatch Retries whole Request process when modifier functions rejects or throws error
	 */
	constructor(
		private modify: (response: RawResponse<T>) => RawResponse<U> | Promise<RawResponse<U>>,
		private retryOnCatch?: () => Promise<any>
	) {
		super();
	}

	public middleware(response: RawResponse<T>): Promise<RawResponse<U>> {
		return Promise.resolve()
			.then(() => this.modify(response))
			.catch(error => {
				if (this.retryOnCatch) {
					throw new Retry(this.retryOnCatch(), error);
				}
				if (!(error instanceof Error)) {
					error = new Error(PostRequest.ERROR, error);
				}
				throw error;
			});
	}
}
