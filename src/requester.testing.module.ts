import { NgModule } from "@angular/core";
import { HttpClientTestingModule } from "@angular/common/http/testing";

import { Requester } from "./requester";
import { MockBackendService } from "./testing";

@NgModule({
	imports: [HttpClientTestingModule],
	providers: [Requester, MockBackendService]
})
export class RequesterTestingModule {}
