import { defer } from "lodash";

export function deferPromise(): Promise<any> {
	return new Promise(resolve => {
		defer(resolve);
	});
}
