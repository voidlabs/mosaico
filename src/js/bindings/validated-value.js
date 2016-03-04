"use strict";

var ko = require('knockout');
var console = require('console');

// equals to "value" binding but apply "invalid" class if "pattern" attribute is defined and value matches the rule
ko.bindingHandlers['validatedValue'] = {
	init: function(element, valueAccessor, allBindings) {
		var newValueAccessor = valueAccessor;
		if (typeof element.pattern !== 'undefined') {
			var re = new RegExp('^(?:' + element.pattern + ')$');
			var computed = ko.computed({
				read: function() {
					var res = ko.utils.unwrapObservable(valueAccessor());
					// TODO support for element.required ?
					var valid = res === null || res === '' || re.test(res);
					// IE11 doesn't support classList.toggle('invalid', state)
					if (valid) {
						element.classList.remove('invalid');
					} else {
						element.classList.add('invalid');
					}
					return res;
				},
				write: ko.isWriteableObservable(valueAccessor()) && function(value) {
					// @see https://github.com/voidlabs/mosaico/issues/103
					ko.selectExtensions.writeValue(element, value);
					var updValue = ko.selectExtensions.readValue(element);
					valueAccessor()(updValue);
				},
				disposeWhenNodeIsRemoved: element
			});
			newValueAccessor = function() {
				return computed;
			};
		}
		ko.bindingHandlers['value'].init(element, newValueAccessor, allBindings);
	}
};
ko.expressionRewriting._twoWayBindings['validatedValue'] = true;
