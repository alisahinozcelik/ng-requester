import { TPromiseFactory } from "./interfaces";

export function promiseChainer(arr: Promise<any>[]): Promise<any> {
	return arr.reduce((prev, curr) => prev.then(res => curr), Promise.resolve());
}

export function promiseFactoryChainer<T = any>(
	arr: TPromiseFactory<any>[],
	initialParam?: any,
	withSameValue: boolean = false
	): Promise<T> {
	return arr.reduce((prev, curr: TPromiseFactory<any>) => prev.then(res => curr(withSameValue ? initialParam : res)), Promise.resolve(initialParam));
}