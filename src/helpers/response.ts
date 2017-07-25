export class Response<T> {
	constructor(public type: symbol, public data: T) {}
}