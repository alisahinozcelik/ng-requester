import { Component } from "@angular/core";
import { Observable } from "rxjs";
import { Requester } from "../src/requester";
import { Guard } from "../src/operators";

@Component({
	selector: 'test',
	template: `<h1>Test Component</h1>`
})
export class TestComponent {
	constructor(req: Requester) {
		const clone = req.addOperator(new Guard(() => false));

		clone.host = "https://jsonplaceholder.typicode.com";
		clone.url = "dsadsaposts/1";

		const clone2 = clone.clone();

		clone.send().subscribe(console.log, console.log, console.log.bind(null, 'completed'));

		clone2.url = "posts/1";
		clone2.send().toPromise().then(console.log).catch(console.log);
	}
}