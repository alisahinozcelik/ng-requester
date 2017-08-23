import {  } from "jasmine";
import { TestBed, inject } from "@angular/core/testing";
import { HttpResponse } from "@angular/common/http";
import { Subject, Observable, Subscription } from "rxjs";
import { extend } from "lodash";

import { RequesterTestingModule, Requester, RawResponse, RequestFiredEvent, Error } from "../index";
import { PreRequest } from "./pre-request";
import { MockBackendService } from "../testing";
import { OpenPromise } from "../utils/open-promise";

describe("Operator: Pre Request", () => {
	let mock: MockBackendService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [RequesterTestingModule]
		});

		mock = TestBed.get(MockBackendService);
	});

	it("should be able to modify request headers", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse(req => req.headers.has("test-header"), {result: true});
			mock.addResponse("/", {result: false});

			requester
				.addOperator(new PreRequest(options => {
					options.headers = options.headers.append("test-header", "test");
					return options;
				}))
				.send()
				.toPromise()
				.then(res => {
					expect(res.data.result).toBe(true);
					done();
				})
				.catch(() => fail());
		})();
	});

	it("should be able to modify request headers by chaining", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse(req => req.headers.has("test-header") && req.headers.has("second-header"), {result: true});
			mock.addResponse("/", {result: false});

			requester
				.addOperator(
					new PreRequest(options => {
						options.headers = options.headers.append("test-header", "test");
						return options;
					}),
					new PreRequest(options => {
						expect(options.headers.has("test-header")).toBe(true);
						options.headers = options.headers.append("second-header", "test");
						return options;
					})
				)
				.send()
				.toPromise()
				.then(res => {
					expect(res.data.result).toBe(true);
					done();
				})
				.catch(() => fail());
		})();
	});

	it("should be able to modify request params", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse(req => req.params.has("test-param"), {result: true});
			mock.addResponse("/", {result: false});

			requester
				.addOperator(new PreRequest(options => {
					options.params = options.params.append("test-param", "test");
					return options;
				}))
				.send()
				.toPromise()
				.then(res => {
					expect(res.data.result).toBe(true);
					done();
				})
				.catch(() => fail());
		})();
	});
});
