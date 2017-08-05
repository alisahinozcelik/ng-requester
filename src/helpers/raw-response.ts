import { HttpResponse, HttpHeaders } from "@angular/common/http";
import { extend } from "lodash";

export interface IHttpResponse<T> {
	body?: T;
	headers?: HttpHeaders;
	status?: number;
	statusText?: string;
	url?: string;
}

export class RawResponse<T> {
	constructor(public type: symbol, public data: HttpResponse<T>) {}

	/**
	 * Assign new success type to the response by cloning it
	 * @param type New response success type to set
	 */
	public assignType(type: symbol): RawResponse<T> {
		return this.clone(type, {});
	}

	/**
	 * Assign new response model to the response by cloning it
	 * @param response New response to set
	 */
	public assignResponse<U = T>(response: IHttpResponse<U>): RawResponse<U> {
		return this.clone(this.type, response);
	}
	/**
	 * Assign new response body to the response by cloning it
	 * @param body New response body to set
	 */
	public assignBody<U = T>(body: U): RawResponse<U> {
		return this.clone(this.type, this.data.clone<U>({body: body}));
	}
	/**
	 * Assign new success type and the new response model to the response by cloning it
	 * @param type New Response Success Type to Set
	 * @param data New response to set
	 */
	public clone<U = T>(type: symbol, data: IHttpResponse<U>): RawResponse<U> {
		return new RawResponse<U>(type, this.data.clone<U>(data));
	}
}
