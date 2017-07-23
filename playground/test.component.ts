import { Component } from "@angular/core";
import { Requester } from "../src";

@Component({
	selector: 'test',
	template: `<h1>Test Component</h1>`
})
export class TestComponent {
	constructor(req: Requester) {
		req
			.setHost('http://www.mocky.io')
			.get('v2/597479ef10000094011bc2da')
			.then(console.log)
			.catch(console.error);
	}
}