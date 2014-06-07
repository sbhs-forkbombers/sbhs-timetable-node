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

var db = {};

function createUser(email) {
	'use strict';
	/* may/may not have broken this */
	if (!(email in db)) {
		db[email] = {};
	}
}

function saveDB() {
	'use strict';
	fs.writeFileSync('users.json', JSON.stringify(db));
}

module.exports = {
	'loadDB': function () {
		'use strict';
		if (db !== {}) {
			return;
		}
		if (fs.existsSync('users.json')) {
			fs.readFile('users.json', function (err, data) {
				if (err) {
					console.error('Failed to load DB: '+err);
				}
				db = JSON.parse(data);
			});
		}
		console.log('Will save DB every 5 minutes');
		setInterval(saveDB, 300000); // save every 5 minutes
	},
	'getTimetableFor': function (email) {
		'use strict';
		createUser(email);
		if ('timetable' in db[email]) {
			return db[email].timetable;
		}
		else {
			db[email].timetable = {};
			return {};
		}
	},
	'updateTimetableEntry': function (email, wk, day, period, newRoom, newSubject) {
		'use strict';
		createUser(email);
		if (email in db) {
			db[email].timetable[wk][day][period].room = newRoom;
			db[email].timetable[wk][day][period].subject = newSubject;
		}
		else {
			console.error('Attempted to update entry '+wk+'.'+day+'.'+period+' for '+email+' but doesn\'t exist!');
		}
	},
	'updateTimetable': function (email, timetable) {
		'use strict';
		createUser(email);
		db[email].timetable = timetable;
	},
	'writeDB': function () {
		'use strict';
		saveDB();
	}

};
