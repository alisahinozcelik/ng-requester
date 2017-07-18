import { OperatorBase, IOperator } from "./operator";

export class OnStart extends OperatorBase implements IOperator {
	constructor(
		private modifier: (id: symbol) => void
	) {
		super();
	}

	public middleware(id: symbol):void {
		this.modifier(id);
	}
}