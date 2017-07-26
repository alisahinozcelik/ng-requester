import { Component } from "@angular/core";
import { Requester } from "../src/requester2";

@Component({
	selector: 'test',
	template: `<h1>Test Component</h1>`
})
export class TestComponent {
	constructor(req: Requester) {
		const clone = req.clone();
		console.log(clone.url);

		req.url = "xxx";
		console.log(clone.url);

		clone.url = "clone";
		console.log(clone.url);

		const newClone = clone.clone();
		console.log(newClone.url);

		newClone.url = "newClone";
		console.log(newClone.url);
	}
}