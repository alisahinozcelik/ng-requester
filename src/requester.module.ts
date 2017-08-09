import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";

import { Requester, IConfigurableProperties } from "./requester";

@NgModule({
	imports: [HttpClientModule],
	providers: [Requester]
})
export class RequesterModule {}
