// Polyfills
import 'es6-shim';
import 'weakmap-polyfill';
// window['Symbol'] = Symbol || require('es6-symbol');

// Vendor
import 'reflect-metadata';

// Lib
export * from './requester';
export * from './requester.module';

export * from './operators/error-handler';
export * from './operators/guard';
export * from './operators/interceptor';
export * from './operators/on-end';
export * from './operators/on-start';
export * from './operators/post-request';
export * from './operators/pre-request';
export * from './operators/error';

export * from './interfaces/methods';
export * from './interfaces/options';
export * from './interfaces/response-types';