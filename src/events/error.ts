import { RequesterEvent } from "./requester-event";
import { Error } from "../helpers";

export abstract class ErrorEvent extends RequesterEvent {
	constructor(
		processId: symbol,
		public error?: Error
	) {
		super(processId);
	}
}
