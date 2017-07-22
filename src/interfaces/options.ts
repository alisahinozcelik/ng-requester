import { HttpHeaders, HttpParams } from "@angular/common/http";

import { RESPONSE_TYPES } from "./response-types";

export interface IRequesterOptions {
	body?: any;
	headers?: HttpHeaders;
	params?: HttpParams;
	responsType?: RESPONSE_TYPES;
}