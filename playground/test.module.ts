import { NgModule } from "@angular/core";
import { BrowserModule } from '@angular/platform-browser';

import { RequesterModule } from "../src";
import { TestComponent } from "./test.component";

@NgModule({
	imports: [BrowserModule, RequesterModule],
	declarations: [TestComponent],
	bootstrap: [TestComponent]
})
export class TestModule {}