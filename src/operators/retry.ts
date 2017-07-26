import { Error } from "../helpers/error";

export class Retry extends Error {
	private static SYMBOL = Symbol('Requester Retry');

	constructor(
		public promise: Promise<any>,
		public error: any
	) {
		super(Retry.SYMBOL, error);
	}
}