require('datejs');
function debug() {
	/*jshint -W040,-W117*/
	'use strict';
	if (global.DEBUG) {
		console.log.call(this, arguments);
	}
}
var terms = {
	'1': {
		'start': {
			'date': new Date('2014-01-28 09:00').valueOf(),
			'term': '1',
			'week': '1',
			'weekType': 'A',
			'events': [],
			'dayNumber': '2'
		},
		'end': {
			'date': new Date('2014-04-11 15:15').valueOf(),
			'term': '1',
			'week': '11',
			'weekType': 'B',
			'events': [],
			'dayNumber': 10
		}
	},
	'2': {
		'start': {
			'date': new Date('2014-04-28 09:00').valueOf(),
			'term': '2',
			'week': '1',
			'weekType': 'C',
			'events': [],
			'dayNumber': 11
		},
		'end': {
			'date': new Date('2014-06-27 15:15').valueOf(),
			'term': '2',
			'week': '9',
			'weekType': 'B',
			'events': [],
			'dayNumber': 10
		}


	},
	'3': {
		'start': {
			'date': new Date('2014-07-15 09:00').valueOf(),
			'term': '3',
			'week': '1',
			'weekType': 'C',
			'events': [],
			'dayNumber': 11
		},
		'end': {
			'date': new Date('2014-09-19 15:15').valueOf(),
			'term': '3',
			'week': '10',
			'weekType': 'C',
			'events': [],
			'dayNumber': 15
		}

	},
	'4': {
		'start': {
			'date': new Date('2014-10-07 09:00').valueOf(),
			'term': '4',
			'week': '1',
			'weekType': 'A',
			'events': [],
			'dayNumber': '2'
		},
		'end': {
			'date': new Date('2014-12-17 15:15').valueOf(),
			'term': '4',
			'week': '11',
			'weekType': 'B',
			'events': [],
			'dayNumber': 10
		}
	}
};

var inTerm = false;
var holEnd = 0;
var TIMEOUT_MAX = 2147483647; // from timers.js
var termStart = 0;
var term = 0;

function calculateInTerm() {
	/* jshint -W083 */
	'use strict';
	var now = Date.now();
	var myFunc, n;
	var lastTermEnd = 0;
	for (var i in terms) {
		var t = terms[i];
		if (t.start.date < now && now < t.end.date) { // in-term
			holEnd = t.end.date;
			term = i;
			termStart = t.start.date;
			n = holEnd - now;
			myFunc = function () {
				if (n > TIMEOUT_MAX) {
					debug('[debug] Resetting end-of-term timer to TIMEOUT_MAX');
					setTimeout(myFunc, TIMEOUT_MAX);
					n -= TIMEOUT_MAX;
				}
				else {
					debug('[debug] will call calculateInTerm in ' + n + 'ms');
					setTimeout(calculateInTerm, n);
				}
			};
			myFunc();
			inTerm = true;
			global.HOLIDAYS = false;
			return;
		}
		else if (now > lastTermEnd && now < t.start.date) {
			n = t.start.date - now;
			term = i;
			termStart = t.start.date;
			myFunc = function () {
				if (n > TIMEOUT_MAX) {
					if (DEBUG) {
						debug('[debug] Resetting end-of-term timer to TIMEOUT_MAX');
					}
					setTimeout(myFunc, TIMEOUT_MAX);
					n -= TIMEOUT_MAX;
				}
				else {
					debug('[debug] will call calculateInTerm in ' + n + 'ms');
					setTimeout(calculateInTerm, n);
				}
			};
			myFunc();
			debug('found the holdays for me! (going into term ' + i + ')');
			holEnd = t.start.date;
		}
		//console.log(t.end.date);
		lastTermEnd = t.end.date;
		debug(i);
	}
	global.HOLIDAYS = ((holEnd - now) > 1000 * 60 * 60 * 24 * 3); // it's holiday mode if there's more than three days left.
	inTerm = false;
}
calculateInTerm();
module.exports = {
	'isDuringSchool': function() {
		'use strict';
		var when = new Date();
		if (!inTerm || when.getDay() === 0 || when.getDay() === 6 || when.getHours() > 15 ||
			(when.getHours() == 15 && when.getMinutes() > 15) || when.getHours() < 9) {
			return false;
		}
		return true;
		
	},
	'getHolidaysFinished': function() {
		'use strict';
		return holEnd;
	},
	'actualHolidaysFinished': function() {
		'use strict';
		return !inTerm;
	},
	'getWeek': function() {
		'use strict';
		if (Date.now() < termStart) {
			return '';
		}
		var ts = new Date(termStart).last().monday();
		var wks = ['A','B','C'];
		var offset = wks.indexOf(terms[term].start.weekType);
		var idx = (new Date().getWeek() - ts.getWeek());
		idx += offset;
		idx %= 3;
		return (['A','B','C'])[idx];
	}
};
