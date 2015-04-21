/* SBHS-Timetable-Node: Countdown and timetable all at once (NodeJS app).
 * Copyright (C) 2015 James Ye, Simon Shields
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
var qs = require('querystring'),
	request = require('request');
//	sessions = require('./session');

var bellsCache = {},
	normalBells = {
		'mon': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Lunch 1','time':'11:10'},{'bell':'Lunch 2','time':'11:30'},{'bell':'3','time':'11:50'},{'bell':'Transition','time':'12:50'},
			{'bell':'4','time':'12:55'},{'bell':'Recess','time':'13:55'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'tue': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Lunch 1','time':'11:10'},{'bell':'Lunch 2','time':'11:30'},{'bell':'3','time':'11:50'},{'bell':'Transition','time':'12:50'},
			{'bell':'4','time':'12:55'},{'bell':'Recess','time':'13:55'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'wed': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Recess','time':'11:10'},{'bell':'3','time':'11:30'},{'bell':'Lunch 1','time':'12:30'},{'bell':'Lunch 2','time':'12:50'},
			{'bell':'4','time':'13:10'},{'bell':'Transition','time':'14:10'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'thu': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Recess','time':'11:10'},{'bell':'3','time':'11:30'},{'bell':'Lunch 1','time':'12:30'},{'bell':'Lunch 2','time':'12:50'},
			{'bell':'4','time':'13:10'},{'bell':'Transition','time':'14:10'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'fri': [
			{'bell':'Roll Call','time':'09:25'},{'bell':'1','time':'09:30'},{'bell':'Transition','time':'10:25'},{'bell':'2','time':'10:30'},
			{'bell':'Recess','time':'11:25'},{'bell':'3','time':'11:45'},{'bell':'Lunch 1','time':'12:40'},{'bell':'Lunch 2','time':'13:00'},
			{'bell':'4','time':'13:20'},{'bell':'Transition','time':'14:15'},{'bell':'5','time':'14:20'},{'bell':'End of Day','time':'15:15'}
		]
	};

function _getAPI(path, token, params, callback) {
	if (typeof callback !== 'function') {
		console.error('no callback given!');
		console.error(new Error());
		return;
	}
	var cb = function(statusCode, data) {
		data._fetchTime = Math.floor(Date.now() / 1000);
		callback(statusCode, data);
	}
	params = params || {};
	if (token) params.access_token = token;
	console.log('[api] get',path);
	request('https://student.sbhs.net.au' + path + '?' + qs.stringify(params), function(err, response, data) {
		if (err) {
			cb(500, {'error': err, 'httpStatus': 500});
			return;
		}
		if (response.statusCode != 200) {
			//console.log('response status', response.statusCode);
			cb(response.statusCode, {'error': 'sbhs error', 'httpStatus': response.statusCode});
			return;
		}
		if (/^Invalid option/.test(data)) {
			cb(404, {'error': 'no such api', 'httpStatus': 404});
			return;
		}

		try {
			var json = JSON.parse(data);
			json.httpStatus = 200;
			cb(200, json);
		} catch (e) {
			console.error('error occurred while parsing json',data, e);
			console.error(e.stack);
			cb(500, {'error': e + '', 'httpStatus': 500});
		}
	});
}

var customAPIs = {};

customAPIs['/api/today.json'] = function(req, res, session) {
	res.setHeader('Content-Type', 'application/json; charset=utf8');
	_getAPI('/api/timetable/daytimetable.json', session.accessToken, req.query, function(status, response) {
		if (status != 200) {
			res.status(status);
			res.end(JSON.stringify(response));
			return;
		}

		var prettified = {httpStatus: 200};
		var version = req.query.v || 1;
		prettified._fetchTime = response._fetchTime;
		prettified.date = response.date;
		if (version == 1) {
			prettified.variationsFinalised = response.shouldDisplayVariations;
		} else {
			prettified.displayVariations = response.shouldDisplayVariations;
		}

		// merge room and class variations into one object for later
		var variations = {}, temp, i;
		if (Object.keys(response.classVariations).length > 0) {
			temp = response.classVariations;
			for (i in temp) {
				var subj = temp[i].year + temp[i].title + '_' + temp[i].period;
				variations[subj] = {
					'hasCover'		: temp[i].type !== 'nocover',
					'casual'		: temp[i].casual,
					'casualDisplay'	: temp[i].casualSurname,
					'cancelled'		: temp[i].type === 'nocover',
					'hasCasual'		: temp[i].type === 'replacement',
					'varies'		: temp[i].type !== 'novariation'
				};
				if (version > 1) {
					variations[subj].teacherVaries = temp[i].type !== 'novariation';
					delete variations[subj].varies;
				}
			}
		}

		if (Object.keys(response.roomVariations).length > 0) {
			temp = response.roomVariations;
			for (i in temp) {
				subjID = temp[i].year + temp[i].title + '_' + temp[i].period;
				variations.roomFrom = temp[i].roomFrom;
				variations.roomTo 	= j[i].roomTo;
			}
		}

		// populate a bells object for later
		var bells = {};
		for (i in response.bells) {
			if (response.bells[i].bell.match(/^\d/)) {
				var b = {};
				b.start = response.bells[i].time;
				b.title = response.bells[i].bellDisplay;
				var nxt = response.bells[Number(i)+1];
				b.end = nxt.time;
				b.next = nxt.bellDisplay;
				bells[response.bells[i].bell] = b;
			}
		}

		// info about the day of week
		prettified.today = response.timetable.timetable.dayname;

		var temp = prettified.today.split(' ');
		var dayNumber = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(temp[0])+1;
		dayNumber += 5 * ['A','B','C'].indexOf(temp[1]);
		prettified.dayNumber = dayNumber;
		prettified.weekType = temp[1];

		// and populate the timetable object
		prettified.timetable = response.timetable.timetable.periods;
		delete prettified.timetable.R;

		prettified.hasVariations = Object.keys(variations).length > 0;

		for (i in prettified.timetable) {
			if (!prettified.timetable.hasOwnProperty(i) || i == 'R') continue;
			temp = prettified.timetable[i];
			subjID = temp.year + temp.title; // like '10MaA'
			subjInfo = response.timetable.subjects[subjID]; // full name etc
			// title is of the form "10 Maths A". strip the 10 and the A
			var title = subjInfo.title.replace(/ [A-Z0-9]$/, '').split(' ');
			prettified.timetable[i].fullName = title.slice(1).join(' ');
			prettified.timetable[i].fullTeacher = subjInfo.fullTeacher.replace(/ . /, ' '); // strip the initial

			// bell
			prettified.timetable[i].bell = bells[i];
			// checking for variations
			subjID += '_' + i;
			prettified.timetable[i].changed = (subjID in variations);
			if (prettified.timetable[i].changed) {
				for (j in variations[subjID]) {
					prettified.timetable[i][j] = variations[subjID][j];
				}
			}
		}

		res.end(JSON.stringify(prettified));
	});
};

customAPIs['/api/notices.json'] = function(req, res, session) {
	_getAPI('/api/dailynews/list.json', session.accessToken, req.query, function(status, json) {
		res.setHeader('Content-Type', 'application/json; charset=utf8');
		if (status !== 200) {
			res.sendStatus(status);
			res.end(JSON.stringify(json));
		}
		var prettified = {httpStatus: 200};
		prettified._fetchTime = json._fetchTime;
		var weighted = {};

		if (json.dayInfo) {
			prettified.date = json.dayInfo.date;
			prettified.term = json.dayInfo.term;
			prettified.week = json.dayInfo.week + json.dayInfo.weekType;
		} else {
			prettified.date = null;
			prettified.term = null;
			prettified.week = null;
		}

		for (i in json.notices) {
			var pEntry = {};
			var weight = 0;
			var entry = json.notices[i];
			weight = Number(entry.relativeWeight);
			if (isNaN(weight)) {
				weight = 0;
			}
			entry.isMeeting = (entry.isMeeting == '1');
			if (entry.isMeeting) {
				weight++;
				pEntry.isMeeting = entry.isMeeting;
				pEntry.meetingDate = entry.meetingDate;
				if (entry.meetingTimeParsed !== '00:00:00') {
					pEntry.meetingTime = entry.meetingTimeParsed;
				} else {
					pEntry.meetingTime = entry.meetingTime;
				}
				pEntry.meetingPlace = entry.meetingLocation;
			}
			pEntry.id = entry.id;
			pEntry.dTarget = entry.displayYears;
			pEntry.years = entry.years;
			pEntry.title = entry.title;
			pEntry.text = entry.content;
			pEntry.author = entry.authorName;
			pEntry.weight = weight;
			if (weight in weighted) {
				weighted[weight].push(pEntry);
			} else {
				weighted[weight] = [pEntry];
			}
		}

		prettified.notices = weighted;
		res.end(JSON.stringify(prettified));
	});
}

customAPIs['/api/bettertimetable.json'] = function(req, res, session) {
	_getAPI('/api/timetable/timetable.json', session.accessToken, req.query, function(status, obj) {
		res.setHeader('Content-Type', 'application/json; charset=utf8');
		if (status !== 200) {
			res.status(status);
			res.end(JSON.stringify(obj));
			return;
		}

		var prettified = {httpStatus: 200};
		prettified._fetchTime = obj._fetchTime;
		prettified.days = obj.days;
		prettified.subjInfo = {};
		for (var i in obj.subjects) {
			if (!obj.subjects.hasOwnProperty(i)) {
				continue;
			}
			var b = obj.subjects[i];
			if (!b.title) { continue; }
			b.title = b.title.split(' ');
			b.title = b.title.slice(1, b.title[b.title.length-1].length == 1 ? -1 : undefined).join(' ');
			prettified.subjInfo[b.year+''+b.shortTitle] = b;
		}
		res.end(JSON.stringify(prettified));
	});
}

customAPIs['/api/belltimes'] = function(req, res, session) {
	_getAPI('/api/timetable/bells.json', session.accessToken, req.query, function(status, obj) {
		var shortDow = obj.day.toLowerCase().substr(0,3);
		//if (obj.bellsAltered) {
		res.type('json');
		if (status !== 200) {
			res.status(status);
			res.end(JSON.stringify(obj));
			return;
		}
		var normal = normalBells[shortDow];
		for (var i in obj.bells) {
			obj.bells[i].index = Number(i);
			if (normal[i].time != obj.bells[i].time) {
				obj.bells[i].different = true;
				obj.bells[i].normally = normal[i].time;
			}
		}
		res.end(JSON.stringify(obj));
	});
}

module.exports = function(req, res) {
	var api = req.path;
	var sessID;
	if (req.query.SESSID) {
		sessID = req.query.SESSID;
		delete req.query.SESSID;
	} else {
		sessID = req.cookies.SESSID;
	}
	var session = sessions.getSessionData(sessID) || {};
	res.set({
		'Pragma': 'no-cache',
		'Cache-Control': 'no-cache, must-revalidate',
		'Expires': 'Sat, 26 Jul 1997 05:00:00 GMT'
	});
	if (api in customAPIs) {
		customAPIs[api](req, res, session);
		return;
	}
	_getAPI(api, session.accessToken, req.query, function(status, response) {
		//console.log('got response: ', response);
		res.setHeader('Content-Type', 'application/json; charset=utf8')
		res.status(status);
		res.end(JSON.stringify(response));
	});
}

module.exports._getAPI = _getAPI;