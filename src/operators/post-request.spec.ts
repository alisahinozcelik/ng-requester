import {  } from "jasmine";
import { TestBed, inject } from "@angular/core/testing";
import { HttpResponse } from "@angular/common/http";
import { Subject, Observable, Subscription } from "rxjs";
import { extend } from "lodash";

import { RequesterTestingModule, Requester, RawResponse, RequestFiredEvent, Error } from "../index";
import { PostRequest } from "./post-request";
import { MockBackendService } from "../testing";
import { OpenPromise } from "../utils/open-promise";

describe("Operator: Post Request", () => {
	let mock: MockBackendService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [RequesterTestingModule]
		});

		mock = TestBed.get(MockBackendService);
	});

	it("should be able to modify response", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {notModified: true});

			requester
				.addOperator(new PostRequest(response => {
					return response.assignBody("modified body");
				}))
				.send()
				.toPromise()
				.then(res => {
					expect(res.data).toBe("modified body");
					done();
				})
				.catch(() => fail());
		})();
	});

	it("should be able to modify response in chaining", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {
				data: {
					users: ["John", "Doe"]
				},
				errors: []
			});

			const obs = requester
				.addOperator(
					new PostRequest((response: RawResponse<{data: {users: string[]}; errors: any[]}>) => {
						const promise = new OpenPromise<RawResponse<any>>();
						setTimeout(() => {
							promise.resolve(response.assignBody(response.data.body.data));
						}, 300);
						return promise.promise;
					}),
					new PostRequest((response: RawResponse<{users: string[]}>) => response.assignBody(response.data.body.users)),
					new PostRequest((response: RawResponse<string[]>) => Promise.resolve(response.assignBody(response.data.body.map(val => val.length))))
				)
				.send()
				.toPromise()
				.then(res => {
					expect(res.data).toEqual([4, 3]);
					done();
				})
				.catch(() => fail());
		})();
	});

	it("should be able to throw error by rejecting", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});

			requester
				.addOperator(new PostRequest(response => {
					return Promise.reject("rejected");
				}))
				.send()
				.toPromise()
				.then(() => {fail(); })
				.catch((err: Error) => {
					expect(err.error).toBe("rejected");
					done();
				});
		})();
	});

	it("should be able to throw error by throwing error in modifier", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});

			requester
				.addOperator(new PostRequest(response => {
					throw "some error";
				}))
				.send()
				.toPromise()
				.then(() => {fail(); })
				.catch((err: Error) => {
					expect(err.error).toBe("some error");
					done();
				});
		})();
	});

	it("should be able to retry process", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});
			let retried = false;

			requester
				.addOperator(new PostRequest(response => {
					if (!retried) {
						throw "some error";
					}
					return Promise.resolve(response);
				}, () => {
					retried = true;
					return Promise.resolve();
				}))
				.send()
				.toPromise()
				.then(() => {
					expect(retried).toBe(true);
					done();
				})
				.catch(() => {
					fail();
				});
		})();
	});

	it("should be able to handle unexpected server data", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});

			requester
				.addOperator(new PostRequest((res: RawResponse<any>) => {
					return res.assignBody(res.data.body.aProperyWhichDoesNotExistsInResponse.andItsChildProperty);
				}))
				.send()
				.toPromise()
				.then(() => {fail(); })
				.catch(err => {done(); });
		})();
	});

	it("should be able to throw its own error", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});

			requester
				.addOperator(new PostRequest((res: RawResponse<any>) => {
					return res.assignBody(res.data.body.aProperyWhichDoesNotExistsInResponse.andItsChildProperty);
				}))
				.send()
				.toPromise()
				.then(() => {fail(); })
				.catch((err: Error) => {
					if (!(err instanceof Error) || err.type !== PostRequest.ERROR) {
						throw "Encountered errors while Post Request process, should be an instance of Error Class and should has type property of PostRequest";
					}
					done();
				});
		})();
	});

	it("should be able to throw custom error", done => {
		inject([Requester], (requester: Requester<any>) => {
			mock.addResponse("/", {});
			const CUSTOM_ERROR = Symbol("CUSTOM_ERROR");

			requester
				.addOperator(new PostRequest((res: RawResponse<any>) => {
					throw new Error(CUSTOM_ERROR, "a custom error");
				}))
				.send()
				.toPromise()
				.then(() => {fail(); })
				.catch((err: Error) => {
					if (!(err instanceof Error)) {
						throw "Custom errors should be allowed";
					}
					if (err.type !== CUSTOM_ERROR) {
						fail();
					}
					done();
				});
		})();
	});

});
