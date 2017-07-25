import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

@Injectable()
export class Requester<T = any> {
	protected instance: Requester<T> = null;

	constructor(
		private client: HttpClient
	) {
	}

	protected static createInstance<T>(instance: Requester<T>): Requester<T> {
		const created = new Requester(instance.client);
		created.instance = instance;
		return created;
	}
}