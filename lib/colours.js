module.exports = {};

var COLOURS = {
	'purple': {
		'fg': 'b388ff',
		'bg': '000000',
		'highBg': 'fff9c4',
		'highFg': '8bc34a'
	},
	'default': {
		'fg': 'ffffff',
		'bg': '000000',
		'highBg': 'e51c23',
		'highFg': 'ffc107'
	},
	'red': {
		'fg': 'e84e40',
		'bg': '000000',
		'highBg': '5af158',
		'highFg': 'cddc39'
	},
	'green': {
		'fg': '8bc34a',
		'bg': '000000',
		'highBg': 'bf360c',
		'highFg': '76ff03',
	}
};

module.exports.get = function(name, invert) {
	'use strict';
	var res = COLOURS.default;
	if (name in COLOURS) {
		res = COLOURS[name];
	}
	if (invert === true) {
		return {
			'fg': res.bg,
			'bg': res.fg,
			'highBg': res.highFg,
			'highFg': res.highBg
		};
	}
	return res;

};

module.exports.getFromUriQuery = function(query) {
	'use strict';
	var defs = COLOURS.default;
	var res = {};
	for (var i in defs) {
		if (i in query) {
			res[i] = query[i];
			if (res[i][0] == '#') {
				res[i] = res[i].substr(1);
			}
		}
		else {
			res[i] = defs[i];
		}
	}
	return res;
};
