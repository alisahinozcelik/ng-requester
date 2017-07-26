import { IOperator, OperatorBase } from "./operator";
import { Error } from "../helpers/error";

export class ErrorHandler extends OperatorBase implements IOperator {
	constructor(private handler: (error: Error) => void) {
		super();
	}

	public middleware(error: Error):void {
		this.handler(error);
	}
}