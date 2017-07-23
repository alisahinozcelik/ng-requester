import 'zone.js';
import 'reflect-metadata';

import { NgModule, Component } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { TestModule } from "./test.module";

const platform = platformBrowserDynamic();

platform.bootstrapModule(TestModule);