interface IHasInstance {
	instance: any;
}

export namespace Inheritor {
	export const SYMBOLS: {[key: string]: symbol} = {};

	export function Basic<T>(defaultValue: T) {
		return function (target: Object, propertyKey: string): any {
			const sym = SYMBOLS[propertyKey] || (SYMBOLS[propertyKey] = Symbol(propertyKey));

			Object.defineProperty(target, propertyKey, {
				get: function() {
					if (this[sym] === undefined) { this[sym] = null; }

					const value = this[sym];

					if (value !== null) {
						return value;
					}
					if (this.instance) {
						return this.instance[propertyKey];
					}
					return defaultValue;
				},
				set: function(val: T) {
					this[sym] = val;
				}
			});
			return null;
		};
	}

	export function ArrayCombiner() {
		return function (target: Object, propertyKey: string): any {
			const sym = SYMBOLS[propertyKey] || (SYMBOLS[propertyKey] = Symbol(propertyKey));

			Object.defineProperty(target, propertyKey, {
				get: function() {
					if (this[sym] === undefined) { this[sym] = []; }

					const inherited = this.instance ? this.instance[propertyKey] : [];
					return [...inherited, ...this[sym]];
				},
				set: function(val: any[]) {
					if (this[sym] === undefined) { this[sym] = []; }
					this[sym].push(...val);
				}
			});
			return null;
		};
	}

	export function MapCombiner() {
		return function(target: Object, propertyKey: string) {
			const sym = SYMBOLS[propertyKey] || (SYMBOLS[propertyKey] = Symbol(propertyKey));

			Object.defineProperty(target, propertyKey, {
				get: function() {
					if (this[sym] === undefined) { this[sym] = new Map<any, any[]>(); }
					const newMap = new Map<any, any[]>();
					const inherited: Map<any, any[]> = this.instance ? this.instance[propertyKey] : new Map();

					mergeMap(newMap, inherited);
					mergeMap(newMap, this[sym]);

					return newMap;
				},
				set: function(val: Map<any, any[]>) {
					if (this[sym] === undefined) { this[sym] = new Map<any, any[]>(); }
					mergeMap(this[sym], val);
				}
			});
		};
	}

	function mergeMap(original: Map<any, any[]>, mapToBind: Map<any, any[]>): void {
		mapToBind.forEach((value, key) => {
			if (!original.has(key)) {
				original.set(key, []);
			}
			original.get(key).push(...mapToBind.get(key));
		});
	}
}
