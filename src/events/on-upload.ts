import { HttpRequest, HttpProgressEvent, HttpEventType } from "@angular/common/http";

import { RequesterEvent } from "./requester-event";

export interface IOriginalUploadEvent extends HttpProgressEvent {
	type: HttpEventType.UploadProgress;
}

export class OnUploadEvent extends RequesterEvent {
	constructor(
		processId: symbol,
		public originalEvent: IOriginalUploadEvent
	) {
		super(processId);
	}
}
