module.exports = {};

var COLOURS = {
	'purple': {
		'fg': 'b388ff',
		'bg': '000',
		'highBg': 'fff9c4',
		'highFg': 'ff4081'
	},
	'default': {
		'fg': 'fff',
		'bg': '000',
		'highBg': 'e51c23',
		'highFg': 'ffc107'
	}
};

module.exports.get = function(name) {
	'use strict';
	if (/^[a-fA-F0-9]+$/.test(name)) {
		return name;
	}
	else if (name in COLOURS) {
		return COLOURS[name];
	}
	else {
		return COLOURS.default;
	}
};

module.exports.getFromUriQuery = function(query) {
	'use strict';
	var defs = COLOURS.default;
	var res = {};
	for (var i in defs) {
		if (i in query) {
			res[i] = query[i];
		}
		else {
			res[i] = defs[i];
		}
	}
	return res;
};