import { HttpRequest } from "@angular/common/http";

import { RequesterEvent } from "./requester-event";

export class RequestFiredEvent<T> extends RequesterEvent {
	constructor(
		processId: symbol,
		public request: HttpRequest<T>
	) {
		super(processId);
	}
}
