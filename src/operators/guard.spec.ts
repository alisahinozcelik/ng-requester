import {  } from "jasmine";
import { TestBed, inject } from "@angular/core/testing";
import { HttpTestingController } from "@angular/common/http/testing";
import { Subject, Observable, Subscription } from "rxjs";

import { RequesterModule, Requester, ProcessStartedEvent, RequestFiredEvent } from "../index";
import { Guard } from "./guard";
import { MockBackendService } from "../testing";

describe("Operator: Guard", () => {
	let http: HttpTestingController;
	let mock: MockBackendService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [RequesterModule.forTesting()]
		});

		http = TestBed.get(HttpTestingController);
		mock = TestBed.get(MockBackendService);
	});

	it("should be able to prevent request", done => {
		inject([Requester], (requester: Requester<any>) => {
			const obs = requester.addOperator(new Guard(() => false)).send();

			obs.toPromise()
				.then(() => {fail(); })
				.catch(() => {done(); });
		})();
	});

	it("should suspend request until its promise resolves", done => {
		inject([Requester], (requester: Requester<any>) => {
			const guard = new Guard(() => {
				return new Promise(resolve => {
					setTimeout(resolve.bind(null, true), 500);
				});
			});

			const obs = requester.addOperator(guard).send();

			setTimeout(() => { http.expectNone("/"); }, 400);
			setTimeout(() => { http.expectOne("/").flush({}); }, 600);

			obs.toPromise()
				.then(() => {done(); })
				.catch(() => {fail(); });
		})();
	});

	it("should retry if retrying promise passed", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});
			let allowed = false;

			const guard = new Guard(
				() => new Promise(resolve => resolve(allowed)),
				() => new Promise(resolve => {
					allowed = true;
					resolve();
				}));

			requester
				.addOperator(guard)
				.send()
				.toPromise()
				.then(() => {done(); })
				.catch(() => {fail(); });
		})();
	});

	it("should throw error if retrying promise rejects", done => {
		inject([Requester], (requester: Requester<any>) => {

			const guard = new Guard(
				() => new Promise(resolve => resolve(false)),
				() => new Promise((resolve, reject) => {
					reject();
				}));

			const obs = requester.addOperator(guard).send();

			obs.toPromise()
				.then(() => {fail(); })
				.catch(() => {done(); });
		})();
	});
});
