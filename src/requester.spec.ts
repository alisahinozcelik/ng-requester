import {  } from "jasmine";
import { TestBed, inject } from "@angular/core/testing";
import { HttpRequest } from "@angular/common/http";
import { HttpTestingController } from "@angular/common/http/testing";
import { Subject, Observable, Subscription } from "rxjs";

import { RequesterTestingModule } from "./requester.testing.module";
import { Requester } from "./requester";
import { METHODS, RESPONSE_TYPES } from "./interfaces";
import { RequestFiredEvent, ProcessFinishedEvent, ProcessStartedEvent } from "./events";
import { Response } from "./helpers";
import { MockBackendService } from "./testing";

describe("Service: Requester", () => {
	let subsArr: Subscription[] = [];
	let http: HttpTestingController;
	let mock: MockBackendService;

	beforeAll(() => {
	});

	beforeEach(() => {
		subsArr.forEach(sub => {
			sub.unsubscribe();
		});
		subsArr = [];

		TestBed.configureTestingModule({
			imports: [RequesterTestingModule]
		});

		http = TestBed.get(HttpTestingController);
		mock = TestBed.get(MockBackendService);
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

			obs.toPromise<string>()
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

	it("request shorthand methods should work", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse(req => req.method === METHODS[METHODS.DELETE] && req.url === "/request", {});
			mock.addResponse(req => req.method === METHODS[METHODS.GET] && req.url === "/get", {});
			mock.addResponse(req => req.method === METHODS[METHODS.POST] && req.url === "/post", {});

			Promise.all([
				requester.request(METHODS.DELETE, "request").toPromise(),
				requester.get("get").toPromise(),
				requester.post("post").toPromise()
			]).then(() => {
				done();
			}).catch(() => {
				fail();
			});
		})();
	});

});
