import { Injectable } from "@angular/core";
import { HttpResponse, HttpRequest, HttpResponseBase, HttpHeaders } from "@angular/common/http";
import { HttpTestingController, RequestMatch, TestRequest } from "@angular/common/http/testing";

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
		response: ArrayBuffer | Blob | string | number | Object | (string | number | Object | null)[] | null | HttpResponseBase,
		waitFor = 0
	): void {
		const map = new Map();
		map.set(RequestFiredEvent, [(ev: RequestFiredEvent<any>) => {
			this.testingController.match(match).forEach(req => {
				setTimeout(() => {
					if (!req.cancelled) {
						if (response instanceof HttpResponseBase) {
							req.flush((response as HttpResponse<any>).body, {
								headers: response.headers,
								status: response.status,
								statusText: response.statusText
							});
						} else {
							req.flush(response);
						}
					}
				}, waitFor);
			});
		}]);

		this.requester["listeners"] = map;
	}
}
