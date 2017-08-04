import { HttpResponse } from "@angular/common/http";
import { extend } from "lodash";

export class RawResponse<T> {
	constructor(public type: symbol, public data: HttpResponse<T>) {}

	public clone<U = T>({
			type: type = this.type,
			data: data = extend<HttpResponse<U>>(this.data)
		}): RawResponse<U> {
		return new RawResponse(type, data);
	}
}
