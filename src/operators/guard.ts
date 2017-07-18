import { Phase } from "./phase";
import { IOperator } from "./operator";

export class Guard extends Phase implements IOperator {
	constructor() {
		super();
	}

	public middleware() {
	}
}