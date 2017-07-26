export function Inheritor<T>(defaultValue: T) {
	return function (target: Object, propertyKey: string): any {
		let value: T = null;

		Object.defineProperty(target, propertyKey, {
			get: function() {
				if (value !== null) {
					return value;
				}
				if (this.instance) {
					return this.instance[propertyKey];
				}
				return defaultValue;
			},
			set: function(val: T) {
				value = val;
			}
		});
		return null;
	}
}