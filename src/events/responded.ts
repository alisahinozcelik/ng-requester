import { HttpResponse } from '@angular/common/http';

import { RequesterEvent } from "./requester-event";

export class RespondedEvent<T> extends RequesterEvent {
	constructor(
		processId: symbol,
		public response: HttpResponse<T>
	) {
		super(processId);
	}
}