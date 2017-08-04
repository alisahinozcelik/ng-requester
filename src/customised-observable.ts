import { Observable as _Obs } from "rxjs";
import { AccomplishedEvent, RequesterEvent, ProcessFinishedEvent } from "./events";
import { Response } from "./helpers";

export declare namespace R {
	export interface Observable<T> extends _Obs<RequesterEvent<T>> {
		toPromise: <U = T>() => Promise<Response<U>>;
	}
}

(() => {
	const original = _Obs.prototype.toPromise;

	_Obs.prototype.toPromise = function() {
		return original.call(this).then((res: RequesterEvent<Response<any>>) => {
			if (res instanceof ProcessFinishedEvent) {
				return (res as AccomplishedEvent<any>).response.data;
			}
			return res;
		});
	};
})();
