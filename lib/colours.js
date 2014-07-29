module.exports = {};

var COLOURS = {
	'purple': 'b388ff'
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
		return 'ffffff';
	}
};