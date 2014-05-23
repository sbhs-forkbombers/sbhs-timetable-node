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
