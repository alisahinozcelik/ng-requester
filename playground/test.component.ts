import { Component } from "@angular/core";
import { Observable } from "rxjs";
import { Requester } from "../src/requester2";

@Component({
	selector: 'test',
	template: `<h1>Test Component</h1>`
})
export class TestComponent {
	constructor(req: Requester) {
		const clone = req.clone();

		clone.send().toPromise()
			.then(console.log)
			.catch(console.error);
	}
}