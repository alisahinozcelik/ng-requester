import { OpenPromise } from "./open-promise";

export function revertPromise<T = any>(promise: Promise<T>): Promise<T> {
	const reverted = new OpenPromise<T>();

	promise
		.then(res => {reverted.reject(res); })
		.catch(err => {reverted.resolve(err); });

	return reverted.promise;
}
