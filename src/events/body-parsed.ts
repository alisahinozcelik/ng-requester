import { HttpResponse } from '@angular/common/http';

import { RequesterEvent } from "./requester-event";

export class BodyParsedEvent<T> extends RequesterEvent {
	constructor(
		processId: symbol,
		public data: T
	) {
		super(processId);
	}
}