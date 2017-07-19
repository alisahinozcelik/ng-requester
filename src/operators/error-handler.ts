import { IOperator, OperatorBase } from "./operator";
import { RequesterError } from "./error";

export class ErrorHandler extends OperatorBase implements IOperator {
	constructor(private handler: (error: RequesterError) => void) {
		super();
	}

	public middleware(error: RequesterError):void {
		this.handler(error);
	}
}