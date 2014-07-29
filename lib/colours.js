module.exports = {};

var COLOURS = {
	'purple': 'b388ff'
};

module.exports.get = function(name) {
	'use strict';
	console.log('CR:',name);	
	if (name in COLOURS) {
		return COLOURS[name];
	}
	else {
		return 'ffffff';
	}
};
	