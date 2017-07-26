import { RequesterEvent } from "./requester-event";
import { Response } from "../helpers";

export class ProcessFinishedEvent<T> extends RequesterEvent<T> {
	constructor(
		processId: symbol,
		response: Response<T>
	) {
		super(processId);
	}
}