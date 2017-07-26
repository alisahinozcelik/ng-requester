export function InheritedMapCombiner() {
	return function (target: Object, propertyKey: string): any {
		let ownValue: Map<any, any> = new Map<any, any>();

		Object.defineProperty(target, propertyKey, {
			get: function() {
				return [...this.instance[propertyKey], ...ownValue];
			},
			set: function(val: Map<any, any>) {
				val.keys()
			}
		});
		return null;
	}
}