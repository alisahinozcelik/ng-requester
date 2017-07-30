export * from './process-started';
export * from './passed-guards';
export * from './request-fired';
export * from './on-upload';
export * from './on-download';
export * from './responded';
export * from './body-parsed';
export * from './process-finished';

export * from './aborted';
export * from './cancelled';
export * from './intercepted';
export * from './restarted';

export * from './requester-event';

import { ProcessStartedEvent } from './process-started';
import { PassedGuardsEvent } from './passed-guards';
import { RequestFiredEvent } from './request-fired';
import { OnUploadEvent } from './on-upload';
import { OnDownloadEvent } from './on-download';
import { RespondedEvent } from './responded';
import { BodyParsedEvent } from './body-parsed';
import { ProcessFinishedEvent } from './process-finished';

import { AbortedEvent } from './aborted';
import { CancelledEvent } from './cancelled';
import { InterceptedEvent } from './intercepted';
import { RestartedEvent } from './restarted';

import { RequesterEvent } from "./requester-event";

export enum EVENTS {
	ProcessStartedEvent,
	PassedGuardsEvent,
	RequestFiredEvent,
	OnUploadEvent,
	OnDownloadEvent,
	RespondedEvent,
	BodyParsedEvent,
	ProcessFinishedEvent,
	AbortedEvent,
	CancelledEvent,
	InterceptedEvent,
	RestartedEvent
}

export const ALL_EVENTS: Function[] = [
	ProcessStartedEvent,
	PassedGuardsEvent,
	RequestFiredEvent,
	OnUploadEvent,
	OnDownloadEvent,
	RespondedEvent,
	BodyParsedEvent,
	ProcessFinishedEvent,
	AbortedEvent,
	CancelledEvent,
	InterceptedEvent,
	RestartedEvent
];