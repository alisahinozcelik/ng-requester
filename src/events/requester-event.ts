export abstract class RequesterEvent<T = any> {
	constructor(
		public processId: symbol
	) {}
}
