import { RequesterEvent } from "./requester-event";
import { Response } from "../helpers";

export class AccomplishedEvent<T> extends RequesterEvent<T> {
	constructor(
		processId: symbol,
		public response: Response<T>
	) {
		super(processId);
	}
}
