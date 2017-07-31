import { HttpResponse } from "@angular/common/http";

import { IOperator, OperatorBase } from "./operator";
import { Error, Retry, Response } from "../helpers";

export class PostRequest<T, U = T> extends OperatorBase implements IOperator {
	private static ERROR = Symbol("Stopped on Post-Request Operation");

	constructor(
		private modify: (response: Response<HttpResponse<T>>) => Promise<Response<HttpResponse<U>>>,
		private retryOnCatch?: () => Promise<any>
	) {
		super();
	}

	public middleware(response: Response<HttpResponse<T>>): Promise<Response<HttpResponse<U>>> {
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