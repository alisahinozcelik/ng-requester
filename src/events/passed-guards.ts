import { RequesterEvent } from "./requester-event";

export class PassedGuardsEvent extends RequesterEvent {
	constructor(processId: symbol) {
		super(processId);
	}
}
