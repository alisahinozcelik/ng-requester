import { Component } from "@angular/core";
import { Requester } from "../src/requester2";

@Component({
	selector: 'test',
	template: `<h1>Test Component</h1>`
})
export class TestComponent {
	constructor(req: Requester) {
		const clone = req.clone();

		clone.send().subscribe();
	}
}