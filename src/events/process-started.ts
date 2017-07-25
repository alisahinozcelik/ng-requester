import { RequesterEvent } from "./requester-event";

export class ProcessStartedEvent extends RequesterEvent {
	constructor(processId: symbol) {
		super(processId);
	}
}