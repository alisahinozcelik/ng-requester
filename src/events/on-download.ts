import { HttpRequest, HttpProgressEvent, HttpEventType } from "@angular/common/http";

import { RequesterEvent } from "./requester-event";

export interface IOriginalDownloadEvent extends HttpProgressEvent {
	type: HttpEventType.DownloadProgress;
}

export class OnDownloadEvent extends RequesterEvent {
	constructor(
		processId: symbol,
		public originalEvent: IOriginalDownloadEvent
	) {
		super(processId);
	}
}
