import { Requester } from "../requester2";

export namespace InheritedMapCombiner {
	const map = new Map<Requester<any>, {[key: string]: Map<any, any>}>();

	export function Decorator(thisObject: Requester<any>) {
		if (!map.has(thisObject)) { map.set(thisObject, {}); }

		return function(target: Object, propertyKey: string) {
			let ownValue: Map<any, any[]> = new Map<any, any[]>();
			map.get(thisObject)[propertyKey] = ownValue;

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

	export function getOwn(instance: Requester<any>, propertyKey: string): Map<any, any> {
		if (map.has(instance) && map.get(instance)[propertyKey]) {
			return map.get(instance)[propertyKey];
		}
		return null;
	}
}

function mergeMap(original: Map<any, any[]>, mapToBind: Map<any, any[]>): void {
	mapToBind.forEach((value, key) => {
		if (!original.has(key)) {
			original.set(key, []);
		}
		original.get(key).push(...mapToBind.get(key));
	});
}