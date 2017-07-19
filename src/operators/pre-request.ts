import { IOperator, OperatorBase } from "./operator";
import { IRequesterOptions } from "../interfaces";
import { RequesterError } from "../requester-error";

export class PreRequest extends OperatorBase implements IOperator {
	private static ERROR = Symbol("Pre Request Error");

	constructor(
		private modifier: (options: IRequesterOptions) => IRequesterOptions | Promise<IRequesterOptions>
	) {
		super();
	}

	public middleware(options: IRequesterOptions):Promise<IRequesterOptions> {
		const result = this.modifier(options);
		return Promise.resolve()
			.then(() => result)
			.catch(error => {
				if (!(error instanceof RequesterError)) {
					error = new RequesterError(PreRequest.ERROR, error);
				}
				throw error;
			});
	}
}