import {  } from "jasmine";
import { TestBed, inject } from '@angular/core/testing';
import { HttpTestingController } from "@angular/common/http/testing";
import { Subject, Observable, Subscription } from 'rxjs';

import { RequesterModule } from "./requester.module";
import { Requester } from "./requester";

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
			requester
				.get<boolean>('')
				.then(val => {
					expect(val).toBe(true);
					done();
				})
				.catch(err => {
					fail();
				});
			setTimeout(() => {
				http.expectOne(req => {
					return true;
				}).flush(JSON.stringify(true));
			}, 500);
		})();
	});
});