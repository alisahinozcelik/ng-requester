import {  } from "jasmine";
import { TestBed, inject } from "@angular/core/testing";
import { HttpTestingController } from "@angular/common/http/testing";
import { Subject, Observable, Subscription } from "rxjs";
import { noop, defer } from "lodash";

import { RequesterModule, Requester, ProcessStartedEvent, RequestFiredEvent } from "../index";
import { Interceptor } from "./interceptor";
import { OpenPromise } from "../utils/open-promise";
import { MockBackendService } from "../testing";

describe("Operator: Interceptor", () => {
	let http: HttpTestingController;
	let mock: MockBackendService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [RequesterModule.forTesting()]
		});

		http = TestBed.get(HttpTestingController);
		mock = TestBed.get(MockBackendService);
	});

	it("should be able to intercept request", done => {
		inject([Requester], (requester: Requester<any>) => {
			const interceptor = new Interceptor(() => Promise.resolve());
			const obs = requester.addOperator(interceptor).send();

			obs.toPromise()
				.then(() => {fail(); })
				.catch(() => {done(); });
		})();
	});

	it("fastest interceptor should intercept", done => {
		inject([Requester], (requester: Requester<any>) => {

			const interceptor1 = new Interceptor(() => new Promise(resolve => setTimeout(resolve, 100)));
			const interceptor2 = new Interceptor(() => new Promise(resolve => setTimeout(resolve, 500)));

			const obs = requester.addOperator(interceptor1, interceptor2).send();
			const startedAt = new Date().getTime();

			obs.toPromise()
				.then(() => {fail(); })
				.catch(() => {
					const diff = new Date().getTime() - startedAt;
					expect(diff).toBeLessThan(500);
					done();
				});
		})();
	});

	it("should not prevent request when intercepting promise fails", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});

			const interceptor = new Interceptor(() => Promise.reject(false));
			requester
				.addOperator(interceptor)
				.send()
				.toPromise()
				.then(() => {done(); })
				.catch(() => {fail(); });
		})();
	});

	it("should prevent request even while the xhr in progress", done => {
		inject([Requester], (requester: Requester<any>) => {
			const promise = new OpenPromise();

			const interceptor = new Interceptor(() => promise.promise);
			const obs = requester.addOperator(interceptor).set({url: "whileXhr"}).send();
			let timeout: boolean | number = false;

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(res => {
					promise.resolve(null);
					timeout = setTimeout(() => {
						const req = http.expectOne("/whileXhr");
						if (!req.cancelled) {
							req.flush({});
						}
					}, 500);
				}, noop);

			obs.toPromise()
				.then(() => {fail(); })
				.catch(() => {
					if (timeout) {clearTimeout(timeout as number); }
					done();
				});
		})();
	});

	it("should retry if retry promise defined", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});

			let intercepted = 0;

			const interceptor = new Interceptor(
				() => new Promise((resolve, reject) => {
					intercepted < 4 ? resolve() : reject();
				}),
				false,
				() => new Promise(resolve => {
					intercepted++;
					resolve();
				}));

			requester
				.addOperator(interceptor)
				.send()
				.toPromise()
				.then(() => {
					expect(intercepted).toBe(4);
					done();
				})
				.catch(() => {fail(); });
		})();
	});

	it("should not call eternal intervals on retry", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});

			let retried = false;
			let eternalCalledCount = 0;

			const interceptor1 = new Interceptor(() => {
				eternalCalledCount++;
				return Promise.reject(null);
			}, true);

			const interceptor2 = new Interceptor(() => new Promise((resolve, reject) => {
				if (!retried) {
					retried = true;
					resolve();
				}
				reject();
			}), false, () => Promise.resolve());

			requester
				.addOperator(interceptor1, interceptor2)
				.send()
				.toPromise()
				.then(() => {
					expect(eternalCalledCount).toBe(1);
					done();
				})
				.catch(() => {fail(); });
		})();
	});

	it("should call temporary interceptors on retry", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});

			let retried = 0;
			let temporaryCalledCount = 0;

			const interceptor1 = new Interceptor(() => {
				temporaryCalledCount++;
				retried++;
				return retried < 3 ? Promise.resolve() : Promise.reject(null);
			}, false, () => Promise.resolve());

			requester
				.addOperator(interceptor1)
				.send()
				.toPromise()
				.then(() => {
					expect(temporaryCalledCount).toBe(3);
					done();
				})
				.catch(() => {fail(); });
		})();
	});
});
