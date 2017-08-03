import { HttpResponse } from "@angular/common/http";
import { extend } from "lodash";

export class RawResponse<T> {
	constructor(public type: symbol, public data: HttpResponse<T>) {}

	public clone<U = T>(): RawResponse<U> {
		return new RawResponse(this.type, extend<HttpResponse<U>>(this.data));
	}
}