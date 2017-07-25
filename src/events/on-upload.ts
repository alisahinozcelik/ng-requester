import { HttpRequest, HttpProgressEvent, HttpEventType } from '@angular/common/http';

import { RequesterEvent } from "./requester-event";

interface IOriginalEvent extends HttpProgressEvent {
	type: HttpEventType.UploadProgress;
}

export class OnUploadEvent extends RequesterEvent {
	constructor(
		processId: symbol,
		public originalEvent: IOriginalEvent
	) {
		super(processId);
	}
}