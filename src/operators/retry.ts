import { RequesterError } from "./error";

export class Retry extends RequesterError {
	private static SYMBOL = Symbol('Requester Retry');

	constructor(
		public promise: Promise<any>,
		public error: any
	) {
		super(Retry.SYMBOL, error);
	}
}