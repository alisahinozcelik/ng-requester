import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";

import { OperatorBase } from "./operators";

export enum METHODS {
	GET,
	DELETE,
	POST,
	PUT,
	PATCH
}

export enum RESPONSE_TYPES {
	arraybuffer,
	blob,
	json,
	text
}

export interface IRequesterOptions {
	body?: any,
	headers?: HttpHeaders,
	params?: HttpParams,
	responsType?: RESPONSE_TYPES
}

@Injectable()
export class Requester<T> {
	protected operators: OperatorBase[] = [];
	protected method: METHODS = METHODS.GET;
	protected url: string = "/";
	protected options: IRequesterOptions = {};

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

	public request<U = T>(method: METHODS, url: string, options: IRequesterOptions = null): Requester<U> {
		return Requester.clone<U>(this, {method: method, url: url, options: options});
	}

	public get<U = T>(url: string, options: IRequesterOptions = null): Requester<U> {
		return this.request(METHODS.GET, url, options);
	}

	public post<U = T>(url: string, options: IRequesterOptions = null): Requester<U> {
		return this.request(METHODS.POST, url, options);
	}

	public put<U = T>(url: string, options: IRequesterOptions = null): Requester<U> {
		return this.request(METHODS.PUT, url, options);
	}

	public patch<U = T>(url: string, options: IRequesterOptions = null): Requester<U> {
		return this.request(METHODS.PATCH, url, options);
	}

	public delete<U = T>(url: string, options: IRequesterOptions = null): Requester<U> {
		return this.request(METHODS.DELETE, url, options);
	}

	/**
	 * Cloning Function of Requester
	 * @param referance Requester Referance to clone its properties
	 * @param cloningProperties Generates and clones merged values of old and new values which given
	 */
	protected static clone<T>(
		referance: Requester<T>,
		cloningProperties: {
			method?: METHODS,
			url?: string,
			options?: IRequesterOptions,
			operators?: OperatorBase[]
		} = {}
	): Requester<T> {

		const requester = new Requester<T>(referance.client);
		const {method, url, options, operators} = cloningProperties;

		if (method !== undefined) {
			requester.method = method;
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
	protected static cloneOptions(oldOptions: IRequesterOptions, newOptions: IRequesterOptions): IRequesterOptions {
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