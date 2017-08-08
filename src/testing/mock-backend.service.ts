import { Injectable } from "@angular/core";
import { HttpResponse, HttpRequest } from "@angular/common/http";
import { HttpTestingController, RequestMatch, TestRequest } from "@angular/common/http/testing";
import { defer } from "lodash";

import { Requester } from "../requester";
import { Inheritor } from "../helpers";
import { RequestFiredEvent } from "../events";

@Injectable()
export class MockBackendService {
	constructor(
		private requester: Requester,
		private testingController: HttpTestingController
	) {
	}

	public addResponse(
		match: string | RequestMatch | ((req: HttpRequest<any>) => boolean),
		response: ArrayBuffer | Blob | string | number | Object | (string | number | Object | null)[] | null
	): void {
		const map = new Map();
		map.set(RequestFiredEvent, [(ev: RequestFiredEvent<any>) => {
			this.testingController.match(match).forEach(req => {
				defer(() => {
					if (!req.cancelled) {
						req.flush(response);
					}
				});
			});
		}]);

		this.requester["listeners"] = map;
	}
}
