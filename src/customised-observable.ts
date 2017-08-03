import { Observable as _Obs } from "rxjs";
import { ProcessFinishedEvent, RequesterEvent } from "./events";

export declare module R {
  export interface Observable<T> extends _Obs<RequesterEvent<T>> {
    toPromise: <U = T>() => Promise<U>;
  }
}

(() => {
  const original = _Obs.prototype.toPromise;

  _Obs.prototype.toPromise = function() {
    return original.call(this).then(res => {
      if (res instanceof ProcessFinishedEvent) {
        return res.response;
      }
      return res;
    });
  }
})();