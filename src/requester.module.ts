import { NgModule, ModuleWithProviders } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { Observable } from "rxjs";

import { ProcessFinishedEvent } from "./events";
import { Requester } from "./requester2";

(() => {
	const original = Observable.prototype.toPromise;
	Observable.prototype.toPromise = function(): Promise<any> {
		return (original.call(this) as Promise<any>).then(res => {
			if (res instanceof ProcessFinishedEvent) {
				return res.response;
			}
			return res;
		});
	};
})();

@NgModule({
	imports: [HttpClientModule],
	providers: [Requester]
})
export class RequesterModule {
	public static forTesting(): Function {
		@NgModule({
			imports: [HttpClientTestingModule],
			providers: [Requester]
		})
		class Module {}
		return Module;
	}
}