import {  } from "jasmine";
import { TestBed, inject } from '@angular/core/testing';
import { HttpTestingController } from "@angular/common/http/testing";
import { Subject, Observable, Subscription } from 'rxjs';

import { RequesterModule } from "./requester.module";
import { Requester } from "./requester";
import { METHODS, RESPONSE_TYPES } from "./interfaces";
import { RequestFiredEvent } from "./events";

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
					http.expectOne('/').flush({});
				});
			
			obs.toPromise()
				.then(() => {
					done();
				})
				.catch(() => {
					fail();
				});
		})();
	});

	it("should request with passed config", done => {
		inject([Requester], (requester: Requester<any>) => {

			const obs = requester
				.set({
					host: 'http://www.test.com',
					url: 'api/fetch',
					method: METHODS.DELETE,
					responseType: RESPONSE_TYPES.arraybuffer
				})
				.send();

			obs.filter(ev => ev instanceof RequestFiredEvent)
				.subscribe(res => {
					http.match(req => {
						return req.url === 'http://www.test.com/api/fetch'
							&& req.method === 'DELETE'
							&& req.responseType === 'arraybuffer'
					}).forEach(req => {req.flush('ok')});
				});
			
			obs.toPromise()
				.then(() => {
					console.log('done');
					done()
				})
				.catch(err => {
					console.log("hata");
					fail()
				});
		})();
	});
});