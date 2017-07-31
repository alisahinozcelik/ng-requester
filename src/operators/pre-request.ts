import { IOperator, OperatorBase } from "./operator";
import { IRequesterOptionsRequired } from "../interfaces";
import { Error } from "../helpers/error";

export class PreRequest extends OperatorBase implements IOperator {
	private static ERROR = Symbol("Stopped on Pre-Request Operation");

	/**
	 * Pass a callback function to temporary modify options before request
	 * @param modifier Callback function, gets current options as parameter, must return modified options
	 */
	constructor(
		private modifier: (options: IRequesterOptionsRequired) => IRequesterOptionsRequired | Promise<IRequesterOptionsRequired>
	) {
		super();
	}

	public middleware(options: IRequesterOptionsRequired):Promise<IRequesterOptionsRequired> {
		const result = this.modifier(options);
		return Promise.resolve()
			.then(() => result)
			.catch(error => {
				if (!(error instanceof Error)) {
					error = new Error(PreRequest.ERROR, error);
				}
				throw error;
			});
	}
}