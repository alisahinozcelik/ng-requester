import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

import { OperatorBase, IOperator, OnStart, Guard, PreRequest, Interceptor, PostRequest, Retry, RequesterError, ErrorHandler, OnEnd } from "./operators";
import { IRequesterOptions, METHODS, RESPONSE_TYPES } from "./interfaces";
import { promiseFactoryChainer } from "./utils/promise-chainer";
import { OpenPromise } from "./utils/open-promise";

@Injectable()
export class Requester<T> {
	protected operators: OperatorBase[] = [];
	protected method: METHODS = METHODS.GET;
	protected host: string = "";
	protected url: string = "";
	protected options: IRequesterOptions = {};

	private static ERROR = Symbol("UNKNOWN_ERROR");

	constructor(
		protected client: HttpClient
	) {
	}

	/**
	 * Change url of the request
	 * @param url Url to set
	 */
	public setUrl<U = T>(url: string): Requester<U> {
		return Requester.clone<U>(this, {url: url});
	}

	/**
	 * Change host of the request
	 * @param host Host to set
	 */
	public setHost<U = T>(host: string): Requester<U> {
		return Requester.clone<U>(this, {host: host});
	}

	/**
	 * Change method of the request
	 * @param method Method to reset request method
	 */
	public setMethod<U = T>(method: METHODS): Requester<U> {
		return Requester.clone<U>(this, {method: method});
	}

	/**
	 * Replaces old options with the new passed
	 * (Be careful, old options will be ignored)
	 * @param options New Options to define
	 */
	public setOptions<U = T>(options: IRequesterOptions): Requester<U> {
		const clone = Requester.clone(this);
		clone.options = options;
		return clone;
	}

	/**
	 * Replaces old operators with the new passed
	 * (Be careful, old operators will be ignored)
	 * @param options New Options to define
	 */
	public setOperators<U = T>(operators: OperatorBase[]): Requester<U> {
		const clone = Requester.clone(this);
		clone.operators = operators;
		return clone;
	}
	
	/**
	 * Modify the options by passing a modifier function
	 * @param modifier A function which gets present options as first parameter and has to return new modified options
	 */
	public modifyOptions<U = T>(modifier: (options: IRequesterOptions) => IRequesterOptions): Requester<U> {
		const options = modifier(Requester.cloneOptions(this.options, {}));
		const clone = Requester.clone(this);
		clone.options = options;

		return clone;
	}

	/**
	 * Modify the operators by passing a modifier function
	 * @param modifier A function which gets present operators as first parameter and has to return a new operators array
	 */
	public modifyOperators<U = T>(modifier: (operators: OperatorBase[]) => OperatorBase[]): Requester<U> {
		const operators = modifier([...this.operators]);
		const clone = Requester.clone(this);
		clone.operators = operators;

		return clone;
	}

	public addOperator<U = T>(...operators: OperatorBase[]): Requester<U> {
		return Requester.clone<U>(this, { operators: [...this.operators, ...operators]});
	}

	public request<U = T>(method: METHODS, url: string, options: IRequesterOptions = null): Promise<U> {
		return Requester.clone<U>(this, {method: method, url: url, options: options}).send();
	}

	public get<U = T>(url: string, options: IRequesterOptions = null): Promise<U> {
		return this.request(METHODS.GET, url, options);
	}

	public post<U = T>(url: string, options: IRequesterOptions = null): Promise<U> {
		return this.request(METHODS.POST, url, options);
	}

	public put<U = T>(url: string, options: IRequesterOptions = null): Promise<U> {
		return this.request(METHODS.PUT, url, options);
	}

	public patch<U = T>(url: string, options: IRequesterOptions = null): Promise<U> {
		return this.request(METHODS.PATCH, url, options);
	}

	public delete<U = T>(url: string, options: IRequesterOptions = null): Promise<U> {
		return this.request(METHODS.DELETE, url, options);
	}

	public send<U = T>(): Promise<U> {
		const requestId = Symbol('Requester.Request');
		const self = this;

		function runCallbacks(type: Function, param: any) {
			self.operators
				.filter(operator => operator instanceof type)
				.forEach((operator: IOperator) => {
					operator.middleware(param);
				});
		}
		
		runCallbacks(OnStart, requestId);
		
		return this._send<U>()
			.catch(error => {
				if (!(error instanceof RequesterError)) {
					error = new RequesterError(Requester.ERROR, error);
				}
				throw error;
			})
			.catch((error: RequesterError) => {
				runCallbacks(ErrorHandler, error);
				runCallbacks(OnEnd, requestId);
				throw error;
			})
			.then(res => {
				runCallbacks(OnEnd, requestId);
				return res;
			});
	}

	private _send<U>(): Promise<U> {
		const guards = this.operators
			.filter(op => op instanceof Guard)
			.map((op: Guard) => op.middleware());

		return Promise.all(guards)
			.then<IRequesterOptions>(() => {
				const preRequestMiddlewares = this.operators
					.filter(val => val instanceof PreRequest)
					.map((val: PreRequest) => val.middleware);

				return promiseFactoryChainer<IRequesterOptions>(preRequestMiddlewares, Requester.cloneOptions(this.options));
			})
			.then<U>(options => {
				// Returning Promise
				const promise = new OpenPromise<U>();

				// Format Request Options for Angular
				const requestOptions: { responsType: string; } & IRequesterOptions = Object.assign({}, options, { responsType: RESPONSE_TYPES[options.responsType] });

				// Send Actual Request
				const subscription = (this.client.request(METHODS[this.method], `${this.host}/${this.url}`, requestOptions) as Observable<U>)
					.subscribe({
						next: res => {
							promise.resolve(res);
						},
						error: err => {
							promise.reject(err);
						}
					});
				
				// Run Interceptors
				const interceptors = this.operators
					.filter(op => op instanceof Interceptor)
					.map((op: Interceptor) => Observable.fromPromise(op.middleware()));
				
				const interceptorSubs = Observable.merge(...interceptors)
					.first()
					.subscribe({
						next: res => {
							subscription.unsubscribe();
							promise.reject(res);
						},
						error: err => {promise.reject(err);}
					});

				// Cancel Interceptors After Response
				function unsubscribe() {
					interceptorSubs.unsubscribe();
				}

				promise.promise
					.then(unsubscribe)
					.catch(unsubscribe);

				return promise.promise;
			})
			.then<U>(val => {
				const postRequestModifiers = this.operators
					.filter(op => op instanceof PostRequest)
					.map((op: PostRequest<U>) => op.middleware);
				
				return promiseFactoryChainer<U>(postRequestModifiers, val);
			})
			.catch<any>((error) => {
				if (error instanceof Retry) {
					return error.promise.then(() => this._send());
				}
				throw error;
			});
	}

	// Static Methods
	/**
	 * Cloning Function of Requester
	 * @param referance Requester Referance to clone its properties
	 * @param cloningProperties Generates and clones merged values of old and new values which given
	 */
	protected static clone<T>(
		referance: Requester<T>,
		cloningProperties: {
			method?: METHODS;
			url?: string;
			host?: string;
			options?: IRequesterOptions;
			operators?: OperatorBase[];
		} = {}
	): Requester<T> {

		const requester = new Requester<T>(referance.client);
		const {method, url, host, options, operators} = cloningProperties;

		if (method !== undefined) {
			requester.method = method;
		}

		if (host !== undefined) {
			requester.host = host;
		}

		if (url !== undefined) {
			requester.url = url;
		}

		requester.options = Requester.cloneOptions(referance.options, (options || {}));
		requester.operators = [...referance.operators, ...operators];

		return requester;
	}

	/**
	 * Clones Request Options
	 * @param oldOptions 
	 * @param newOptions 
	 */
	protected static cloneOptions(oldOptions: IRequesterOptions, newOptions: IRequesterOptions = {}): IRequesterOptions {
		const options = Object.assign({}, oldOptions, newOptions);

		// Handle Headers
		options.headers = oldOptions.headers || new HttpHeaders();
		const newHeaders = newOptions.headers || new HttpHeaders();
		
		newHeaders.keys().forEach(key => {
			options.headers.append(key, newHeaders.getAll(key));
		});

		// Handle Params
		options.params = oldOptions.params || new HttpParams();
		const newParams = newOptions.params || new HttpParams();

		newParams.keys().forEach(key => {
			options.headers.append(key, newParams.getAll(key));
		});

		return options;
	}
}