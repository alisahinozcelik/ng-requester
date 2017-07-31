interface IHasInstance {
	instance: any;
}

export namespace Inheritor {
	const data = new Map<IHasInstance, {[key: string]: any}>();

	export function Basic<T>(defaultValue: T) {
		return function (target: Object, propertyKey: string): any {
			const sym = Symbol(propertyKey);

			Object.defineProperty(target, propertyKey, {
				get: function() {
					if (this[sym] === undefined) { this[sym] = null;}

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
		}
	}

	export function ArrayCombiner(thisObject: IHasInstance) {
		if (!data.has(thisObject)) {data.set(thisObject, {});}

		return function (target: Object, propertyKey: string): any {
			const ownValue = data.get(this)[propertyKey] = [];

			Object.defineProperty(target, propertyKey, {
				get: function() {
					const inherited = this.instance ? this.instance[propertyKey] : [];
					return [...inherited, ...ownValue];
				},
				set: function(val: any[]) {
					ownValue.push(...val);
				}
			});
			return null;
		}
	}

	export function MapCombiner(thisObject: IHasInstance) {
		if (!data.has(thisObject)) { data.set(thisObject, {}); }

		return function(target: Object, propertyKey: string) {
			let ownValue: Map<any, any[]> = new Map<any, any[]>();
			data.get(thisObject)[propertyKey] = ownValue;

			Object.defineProperty(target, propertyKey, {
				get: function() {
					const newMap = new Map<any, any[]>();
					const inherited: Map<any, any[]> = this.instance ? this.instance[propertyKey] : new Map();

					mergeMap(newMap, inherited);
					mergeMap(newMap, ownValue);

					return newMap;
				},
				set: function(val: Map<any, any[]>) {
					mergeMap(ownValue, val);
				}
			});
		}
	}

	export function Clone() {

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