import { Error, IError } from "./error";

export class Retry extends Error implements IError {
	private static SYMBOL = Symbol('Requester Retry');

	constructor(
		public promise: Promise<any>,
		public error: any,
		public data?: any
	) {
		super(Retry.SYMBOL, error);
	}
}