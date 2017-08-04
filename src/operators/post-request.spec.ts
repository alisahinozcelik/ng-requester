import {  } from "jasmine";
import { TestBed, inject } from "@angular/core/testing";
import { HttpTestingController } from "@angular/common/http/testing";
import { HttpResponse } from "@angular/common/http";
import { Subject, Observable, Subscription } from "rxjs";
import { extend } from "lodash";

import { RequesterModule, Requester, RawResponse, RequestFiredEvent } from "../index";
import { PostRequest } from "./post-request";

describe("Operator: Post Request", () => {
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [RequesterModule.forTesting()]
		});

		http = TestBed.get(HttpTestingController);
	});

	it("should be able to modify response", done => {
		inject([Requester], (requester: Requester<any>) => {
			const obs = requester
				.addOperator(new PostRequest(response => {
					return Promise.resolve(response.clone({data: extend<HttpResponse<string>>(response.data, {body: "modified body"})}));
				}))
				.send();

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(() => {
					http.expectOne("/").flush({notModified: true});
				});

			obs.toPromise()
				.then(res => {
					expect(res).toBe("modified body");
					done();
				})
				.catch(() => fail());
		})();
	});

	it("should be able to throw error", done => {
		inject([Requester], (requester: Requester<any>) => {
			done();
		})();
	});

	it("should be able to retry process", done => {
		inject([Requester], (requester: Requester<any>) => {
			done();
		})();
	});

	it("should be able to handle unexpected server data", done => {
		inject([Requester], (requester: Requester<any>) => {
			done();
		})();
	});

});
