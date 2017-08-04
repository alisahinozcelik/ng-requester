import { RequesterEvent } from "./requester-event";
import { Response, Error } from "../helpers";

export class ProcessFinishedEvent<T> extends RequesterEvent<T> {
	constructor(
		processId: symbol,
		public response: Response<T> | Error
	) {
		super(processId);
	}
}
