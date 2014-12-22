/* SBHS-Timetable-Node: Countdown and timetable all at once (NodeJS app).
 * Copyright (C) 2014 James Ye, Simon Shields
 *
 * This file is part of SBHS-Timetable-Node.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

require('datejs');

function debug() {
	'use strict';
	if (global.DEBUG) {
		console.log.call(console, arguments);
	}
}

var terms = {
	'1': {
		'start': {
			'date': new Date('2015-01-28 09:00').valueOf(),
			'term': '1',
			'week': '1',
			'weekType': 'A',
			'events': [],
			'dayNumber': '2'
		},
		'end': {
			'date': new Date('2015-04-02 15:15').valueOf(),
			'term': '1',
			'week': '11',
			'weekType': 'B',
			'events': [],
			'dayNumber': 10
		}
	},
	'2': {
		'start': {
			'date': new Date('2015-04-21 09:00').valueOf(),
			'term': '2',
			'week': '1',
			'weekType': 'C',
			'events': [],
			'dayNumber': 11
		},
		'end': {
			'date': new Date('2015-06-26 15:15').valueOf(),
			'term': '2',
			'week': '9',
			'weekType': 'B',
			'events': [],
			'dayNumber': 10
		}


	},
	'3': {
		'start': {
			'date': new Date('2015-07-14 09:00').valueOf(),
			'term': '3',
			'week': '1',
			'weekType': 'C',
			'events': [],
			'dayNumber': 11
		},
		'end': {
			'date': new Date('2015-09-18 15:15').valueOf(),
			'term': '3',
			'week': '10',
			'weekType': 'C',
			'events': [],
			'dayNumber': 15
		}

	},
	'4': {
		'start': {
			'date': new Date('2015-10-06 09:00').valueOf(),
			'term': '4',
			'week': '1',
			'weekType': 'A',
			'events': [],
			'dayNumber': '2'
		},
		'end': {
			'date': new Date('2015-12-16 12:30').valueOf(),
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
					console.log('[debug] Resetting end-of-term timer to TIMEOUT_MAX');
					setTimeout(myFunc, TIMEOUT_MAX);
					n -= TIMEOUT_MAX;
				}
				else {
					console.log('[debug] will call calculateInTerm in ' + n + 'ms');
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
					console.log('[debug] Resetting end-of-term timer to TIMEOUT_MAX');
					setTimeout(myFunc, TIMEOUT_MAX);
					n -= TIMEOUT_MAX;
				}
				else {
					console.log('[debug] will call calculateInTerm in ' + n + 'ms');
					setTimeout(calculateInTerm, n);
				}
			};
			myFunc();
			console.log('found the holdays for me! (going into term ' + i + ')');
			holEnd = t.start.date;
		}
		lastTermEnd = t.end.date;
	}
	global.HOLIDAYS = ((holEnd - now) > 1000 * 60 * 60 * 24 * 5); // it's holiday mode if there's more than five days left.
	inTerm = false;
}

function doubleCheck() { // well it's not restarting every day now is it???
	'use strict';
	calculateInTerm();
	var now = new Date();
	if (now.getHours() > 15 || (now.getHours() == 15 && now.getMinutes() > 15)) {
		now.setDate(now.getDate()+1);
	}
	now.setHours(15,15);
	var nextThreeFifteen = now.valueOf() - new Date().valueOf();
	setTimeout(doubleCheck, nextThreeFifteen);
}
doubleCheck();

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
