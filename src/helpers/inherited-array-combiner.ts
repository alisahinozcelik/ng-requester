export function InheritedArrayCombiner() {
	return function (target: Object, propertyKey: string): any {
		let ownValue: any[] = [];

		Object.defineProperty(target, propertyKey, {
			get: function() {
				return [...this.instance[propertyKey], ...ownValue];
			},
			set: function(val: any[]) {
				ownValue.push(...val);
			}
		});
		return null;
	}
}