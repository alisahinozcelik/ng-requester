export interface IError {
	type: symbol;
	error: any;
}

export class Error {
	constructor(public type: symbol, public error: any) {}
}
