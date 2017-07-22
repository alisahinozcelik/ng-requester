import { NgModule, ModuleWithProviders } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { HttpClientTestingModule } from "@angular/common/http/testing";

import { Requester } from "./requester";

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