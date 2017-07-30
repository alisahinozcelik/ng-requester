export function InheritedArrayCombiner() {
	return function (target: Object, propertyKey: string): any {
		let ownValue: any[] = [];

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