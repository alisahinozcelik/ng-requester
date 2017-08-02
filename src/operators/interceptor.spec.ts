import {  } from "jasmine";
import { TestBed, inject } from '@angular/core/testing';
import { HttpTestingController } from "@angular/common/http/testing";
import { Subject, Observable, Subscription } from 'rxjs';
import { noop, defer } from "lodash";

import { RequesterModule, Requester, ProcessStartedEvent, RequestFiredEvent } from "../index";
import { Interceptor } from "./interceptor";
import { OpenPromise } from "../utils/open-promise";

describe("Operator: Interceptor", () => {
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [RequesterModule.forTesting()]
		});

		http = TestBed.get(HttpTestingController);
	});

	it("should be able to intercept request", done => {
		inject([Requester], (requester: Requester<any>) => {
			const interceptor = new Interceptor(() => Promise.resolve());
			const obs = requester.addOperator(interceptor).send();

			obs.toPromise()
				.then(() => {fail();})
				.catch(() => {done();})
		})();
	});

	it("fastest interceptor should intercept", done => {
		inject([Requester], (requester: Requester<any>) => {

			const interceptor_1 = new Interceptor(() => new Promise(resolve => setTimeout(resolve, 100)));
			const interceptor_2 = new Interceptor(() => new Promise(resolve => setTimeout(resolve, 500)));

			const obs = requester.addOperator(interceptor_1, interceptor_2).send();
			const startedAt = new Date().getTime();

			obs.toPromise()
				.then(() => {fail();})
				.catch(() => {
					const diff = new Date().getTime() - startedAt;
					expect(diff).toBeLessThan(500);
					done();
				});
		})();
	});

	it("should not prevent request when intercepting promise fails", done => {
		inject([Requester], (requester: Requester<any>) => {
			const interceptor = new Interceptor(() => Promise.reject(false));
			const obs = requester.addOperator(interceptor).send();

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(res => {
					http.expectOne('/').flush({});
				});

			obs.toPromise()
				.then(() => {done();})
				.catch(() => {fail();})
		})();
	});

	it("should prevent request even while the xhr in progress", done => {
		inject([Requester], (requester: Requester<any>) => {
			const promise = new OpenPromise();

			const interceptor = new Interceptor(() => promise.promise);
			const obs = requester.addOperator(interceptor).set({url: 'whileXhr'}).send();
			let timeout: boolean | number = false;

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(res => {
					promise.resolve(null);
					timeout = setTimeout(() => {
						const req = http.expectOne('/whileXhr');
						if (!req.cancelled) {
							req.flush({});
						}
					}, 500);
				}, noop);

			obs.toPromise()
				.then(() => {fail();})
				.catch(() => {
					if (timeout) {clearTimeout(timeout as number)}
					done();
				});
		})();
	});

	it("should retry if retry promise entered", done => {
		inject([Requester], (requester: Requester<any>) => {
			let intercepted = 0;

			const interceptor = new Interceptor(
				() => new Promise((resolve, reject) => {
					if (intercepted < 4) { resolve();}
					else {reject();}
				}),
				false,
				() => new Promise(resolve => {
					intercepted++;
					resolve();
				}));
			
			const obs = requester
				.addOperator(interceptor)
				.send();
			
			obs.filter(ev => ev instanceof RequestFiredEvent)
				.debounceTime(50)
				.subscribe(() => {
					http.match('/').forEach(val => {
						if (!val.cancelled) {val.flush({})}
					});
				});
			
			obs
				.toPromise()
				.then(() => {
					expect(intercepted).toBe(4);
					done();
				})
				.catch(() => {fail();});
		})();
	});

	it("should not call eternal intervals on retry", done => {
		inject([Requester], (requester: Requester<any>) => {

			let retried = false;
			let eternalCalledCount = 0;

			const interceptor_1 = new Interceptor(() => {
				eternalCalledCount++;
				return Promise.reject(null);
			}, true);

			const interceptor_2 = new Interceptor(() => new Promise((resolve, reject) => {
				if (!retried) {
					retried = true;
					resolve();
				}
				reject();
			}), false, () => Promise.resolve());

			const obs = requester.addOperator(interceptor_1, interceptor_2).send();

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.debounceTime(50)
				.subscribe(() => {
					http.match('/').forEach(val => {
						if (!val.cancelled) {val.flush({})}
					});
				});

			obs.toPromise()
				.then(() => {
					expect(eternalCalledCount).toBe(1);
					done();
				})
				.catch(() => {fail();});
		})();
	});
});