import { OperatorBase, IOperator } from "./operator";

export class OnEnd extends OperatorBase implements IOperator {
	constructor(
		private callback: (id: symbol) => void
	) {
		super();
	}

	public middleware(id: symbol):void {
		this.callback(id);
	}
}