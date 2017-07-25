import { HttpRequest, HttpProgressEvent, HttpEventType } from '@angular/common/http';

import { RequesterEvent } from "./requester-event";

interface IOriginalEvent extends HttpProgressEvent {
	type: HttpEventType.DownloadProgress;
}

export class OnDownloadEvent extends RequesterEvent {
	constructor(
		processId: symbol,
		public originalEvent: IOriginalEvent
	) {
		super(processId);
	}
}