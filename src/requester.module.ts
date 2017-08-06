import { NgModule, ModuleWithProviders } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { Observable } from "rxjs";

import { ProcessFinishedEvent } from "./events";
import { Requester } from "./requester";
import { MockBackendService } from "./testing";

@NgModule({
	imports: [HttpClientModule],
	providers: [Requester]
})
export class RequesterModule {
	public static forTesting(): Function {
		@NgModule({
			imports: [HttpClientTestingModule],
			providers: [Requester, MockBackendService]
		})
		class Module {}
		return Module;
	}
}
