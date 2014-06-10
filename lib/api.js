/* SBHS-Timetable-Node: Countdown and timetable all at once (NodeJS app).
 * Copyright (C) 2014 James Ye,  Simon Shields
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
	auth = require('./auth.js'),
	request = require('request');

function getSHSAPI(path, token, params, post, cb) {
	'use strict';
	console.log('requesting SHS API ' + path);
	var req,
		b = function(err, z, d) {
			var progress = '';
			if (err || z === undefined) {
				cb({'error': err, 'status': 500});
			}
			if (z.statusCode != 200) {
				console.log('error while getting ' + path + ': HTTP status ' + z.statusCode);
				cb({'error': 'not ok', 'status': z.statusCode});
				return;
			}
			var responded = false;
			var obj = {};
			try {
				obj = JSON.parse(d);
				cb(obj);
				responded = true;
			}
			catch (e) {
				console.error('incomplete json response - ' + d, 'node err was', err);
				console.error(e.stack);
				cb({'error': 'not enough json', 'shs_response': d});
			}
		};
	if (typeof params !== 'object') {
		params = {};
	}
	params.access_token = token;
	if (!post) {
		req = request('http://student.sbhs.net.au' + path + '?' + qs.stringify(params), b);
	} else {
		req = request.post({
			'uri': 'http://student.sbhs.net.au' + path,
			'form': params
		}, b);
	}
	console.log('sent request');
}

var apis = {
	// raw API requests
	'daytimetable.json': function(opts, sessID, cb) {
		'use strict';
		auth.refreshTokenIfNeeded(sessID, function() {
			var params = {};
			if ('date' in opts && opts.date !== '') {
				params.date = opts.date;
			}
			var session = sessions[sessID];
			getSHSAPI('/api/timetable/daytimetable.json', session.accessToken, params, false, cb);
		});
	},
	'timetable.json': function(opts, sessID, cb) {
		'use strict';
		auth.refreshTokenIfNeeded(sessID, function() {
			var params = {};
			if ('date' in opts && opts.date !== '') {
				params.date = opts.data;
			}
			var session = sessions[sessID];
			getSHSAPI('/api/timetable/timetable.json', session.accessToken, params, false, cb);
		});
	},
	'dailynews.json': function(opts, sessID, cb) {
		'use strict';
		auth.refreshTokenIfNeeded(sessID, function() {
			var params = {};
			if ('date' in opts && opts.date !== '') {
				params.date = opts.date;
			}
			var session = sessions[sessID];
			getSHSAPI('/api/dailynews/list.json', session.accessToken, params, false, cb);
		});
	},
	'participation.json': function(opts, sessID, cb) {
		'use strict';
		auth.refreshTokenIfNeeded(sessID, function() {
			var session = sessions[sessID];
			getSHSAPI('/api/details/participation.json', session.accessToken, {}, false, cb);
		});
	},
	'userinfo.json': function(opts, sessID, cb) {
		'use strict';
		auth.refreshTokenIfNeeded(sessID, function() {
			var session = sessions[sessID];
			getSHSAPI('/api/details/userinfo.json', session.accessToken, {}, false, cb);
		});
	},
	// API requests that are actually used by the client (easier to display etc)
	'today.json': function(opts, sessID, cb) {
		'use strict';
		apis['daytimetable.json'](opts, sessID, function(obj) {
			var prettified = {}, i, j, subjID, subjInfo, variations = {};
			if (obj.timetable === undefined || obj.timetable === null || obj.error) {
				cb(obj);
				return;
			}
			prettified.variationsFinalised = obj.shouldDisplayVariations;
			if (Object.keys(obj.roomVariations).length > 0) {
				// room variations
				j = obj.roomVariations;
				for (i in j) {
					subjID = j[i].year + j[i].title + '_' + j[i].period;
					variations[subjID] = {
						'roomFrom': j[i].roomFrom,
						'roomTo': j[i].roomTo
					};
				}
			}
			if (Object.keys(obj.classVariations).length > 0) {
				// teacher variations
				j = obj.classVariations;
				for (i in j){
					subjID = j[i].year + j[i].title + '_' + j[i].period;
					if (!(subjID in variations)) {
						variations[subjID] = {};
					}
					variations[subjID].hasCover = (j[i].type !== 'nocover');
					variations[subjID].casual = j[i].casual;
					variations[subjID].casualDisplay = j[i].casualSurname;
					variations[subjID].hasCasual = (j[i].type == 'replacement');
					variations[subjID].varies = (j[i].type != 'novariation');
				}
			}
			prettified.timetable = obj.timetable.timetable.periods;
			prettified.timetable.R = '';
			prettified.today = obj.timetable.timetable.dayname;
			prettified.hasVariations = Object.keys(variations).length > 0;
			for (i in prettified.timetable) {
				if (!prettified.timetable.hasOwnProperty(i) || i == 'R') {
					continue;
				}
				j = prettified.timetable[i];
				subjID = j.year + j.title;
				subjInfo = obj.timetable.subjects[subjID];
				prettified.timetable[i].fullName = subjInfo.title.split(' ')[1];
				prettified.timetable[i].fullTeacher = subjInfo.fullTeacher.replace(/ . /, ' ');
				subjID += '_' + i;
				prettified.timetable[i].changed = (subjID in variations);
				if (subjID in variations) {
					for (j in variations[subjID]) {
						prettified.timetable[i][j] = variations[subjID][j];
					}
				}
			}
			cb(prettified);
		});
	},
	'notices.json': function(opts, sessID, cb) {
		'use strict';
		apis['dailynews.json'](opts, sessID, function(obj) {
			var prettified, i, j, entry = {}, pEntry = {}, weight = 0, weighted = {};
			if (typeof obj.error === 'string') {
				cb(obj);
				return;
			}
			prettified = {};
			if (obj.dayInfo) {
				prettified.date = obj.dayInfo.date;
				prettified.term = obj.dayInfo.term;
				prettified.week = obj.dayInfo.week + obj.dayInfo.weekType;
			}
			else {
				prettified.date = null;
				prettified.term = null;
				prettified.week = null;
			}

			for (i in obj.notices) {
				pEntry = {};
				weight = 0;
				entry = obj.notices[i];
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
					}
					else {
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
				}
				else {
					weighted[weight] = [pEntry];
				}
			}

			prettified.notices = weighted;
			cb(prettified);

		});
	}
};

module.exports = apis;

module.exports = {
	'get': function request(name, opts, sessID, cb) {
		'use strict';
		if (name in apis && apis.hasOwnProperty(name)) {
			if (typeof opts !== 'object') {
				opts = {};
			}
			apis[name].call(null, opts, sessID, cb);
		}
		else {
			console.error('Invalid API: ' + name);
			cb({explosion: true, error: 'No such API'});
		}
	},
	'isAPI': function isAPI(name) {
		'use strict';
		return name in apis && apis.hasOwnProperty(name);
	}
};
