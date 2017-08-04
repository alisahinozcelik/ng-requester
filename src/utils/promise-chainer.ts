import { TPromiseFactory } from "./interfaces";

export function promiseChainer(arr: Promise<any>[]): Promise<any> {
	return arr.reduce((prev, curr) => prev.then(res => curr), Promise.resolve());
}

export function promiseFactoryChainer<T = any>(
	arr: TPromiseFactory<T>[],
	initialParam?: T,
	withSameValue = false
	): Promise<T> {
	return arr.reduce((prev, curr: TPromiseFactory<any>) => {
		return prev.then(res => {
			return curr(withSameValue ? initialParam : res);
		});
	}, Promise.resolve(initialParam));
}
