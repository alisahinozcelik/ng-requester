import {  } from "jasmine";
import { TestBed, inject } from "@angular/core/testing";
import { HttpRequest } from "@angular/common/http";
import { HttpTestingController } from "@angular/common/http/testing";
import { Subject, Observable, Subscription } from "rxjs";

import { RequesterModule } from "./requester.module";
import { Requester } from "./requester";
import { METHODS, RESPONSE_TYPES } from "./interfaces";
import { RequestFiredEvent, ProcessFinishedEvent, ProcessStartedEvent } from "./events";
import { Response } from "./helpers";

describe("Service: Requester", () => {
	let subsArr: Subscription[] = [];
	let http: HttpTestingController;

	beforeAll(() => {
	});

	beforeEach(() => {
		subsArr.forEach(sub => {
			sub.unsubscribe();
		});
		subsArr = [];

		TestBed.configureTestingModule({
			imports: [RequesterModule.forTesting()]
		});

		http = TestBed.get(HttpTestingController);
	});

	it("should initialise properly", done => {
		inject([Requester], (requester: Requester<any>) => {
			done();
		})();
	});

	it("should request", done => {
		inject([Requester], (requester: Requester<any>) => {
			const obs = requester.send();

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(res => {
					http.expectOne("/").flush({});
				});

			obs.toPromise()
				.then(() => {done(); })
				.catch(() => {fail(); });
		})();
	});

	it("should request with passed config", done => {
		inject([Requester], (requester: Requester<any>) => {

			const obs = requester
				.set({
					host: "http://www.test.com",
					url: "api/fetch",
					method: METHODS.DELETE,
					responseType: RESPONSE_TYPES.arraybuffer
				})
				.send();

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(res => {
					http.match(req => {
						return req.url === "http://www.test.com/api/fetch"
							&& req.method === "DELETE"
							&& req.responseType === "arraybuffer";
					}).forEach(req => {req.flush(new ArrayBuffer(500)); });
				});

			obs.toPromise()
				.then(() => {done(); })
				.catch(err => {fail(); });
		})();
	});

	it("should not throw error on 404 response (angular defines 400-500 requests as Errors)", done => {
		inject([Requester], (requester: Requester<any>) => {
			const obs = requester.send();

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(res => {
					http.expectOne("/").flush({}, {status: 404, statusText: "it's not an error"});
				});

			obs.toPromise()
				.then(() => {done(); })
				.catch(() => {fail(); });
		})();
	});

	it("should return the BODY, when request observable turned into promise, not the ProcessFinishedEvent", done => {
		inject([Requester], (requester: Requester<any>) => {
			const obs = requester.set({responseType: RESPONSE_TYPES.text}).send();

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(res => {
					http.expectOne("/").flush("body");
				});

			obs.toPromise<Response<string>>()
				.then(res => {
					expect(res.data).toBe("body");
					done();
				})
				.catch(() => {fail(); });
		})();
	});

	it("should request with ancestor config unless it has been configured", done => {
		inject([Requester], (requester: Requester<any>) => {
			const clone = requester.clone();

			requester.host = "http://test.com";
			requester.method = METHODS.POST;

			const obs = clone.send();

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(res => {
					http.expectNone("/");
					http.expectOne((req: HttpRequest<any>) => {
						return req.method === "POST" && req.url === "http://test.com/";
					}).flush({});
				});

			obs.toPromise()
				.then(() => {done(); })
				.catch(() => {fail(); });
		})();
	});

	it("should call bound event listeners", done => {
		inject([Requester], (requester: Requester<any>) => {
			const obs = requester
				.addListener(ProcessStartedEvent, (e: ProcessStartedEvent) => {
					done();
				})
				.send();

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(res => {
					http.expectOne("/").flush({});
				});

			obs.toPromise().catch(() => {fail(); });
		})();
	});

});
