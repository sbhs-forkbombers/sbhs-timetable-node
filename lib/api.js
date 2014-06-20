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

var qs = require('querystring'),
	auth = require('./auth.js'),
	request = require('request'),
	etag = require('./etag.js'),
	bellsCache = {},
	normalBells = {
		'mon': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Lunch 1','time':'11:10'},{'bell':'Lunch 2','time':'11:30'},{'bell':'3','time':'11:50'},{'bell':'Transition','time':'12:50'},{'bell':'4','time':'12:55'},
			{'bell':'Recess','time':'13:55'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'tue': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Lunch 1','time':'11:10'},{'bell':'Lunch 2','time':'11:30'},{'bell':'3','time':'11:50'},{'bell':'Transition','time':'12:50'},{'bell':'4','time':'12:55'},
			{'bell':'Recess','time':'13:55'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'wed': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Recess','time':'11:10'},{'bell':'3','time':'11:30'},{'bell':'Lunch 1','time':'12:30'},
			{'bell':'Lunch 2','time':'12:50'},{'bell':'4','time':'13:10'},{'bell':'Transition','time':'14:10'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'thu': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Recess','time':'11:10'},{'bell':'3','time':'11:30'},{'bell':'Lunch 1','time':'12:30'},
			{'bell':'Lunch 2','time':'12:50'},{'bell':'4','time':'13:10'},{'bell':'Transition','time':'14:10'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'fri': [
			{'bell':'Roll Call','time':'09:25'},{'bell':'1','time':'09:30'},{'bell':'Transition','time':'10:25'},{'bell':'2','time':'10:30'},
			{'bell':'Lunch 1','time':'11:25'},{'bell':'Lunch 2','time':'11:45'},{'bell':'3','time':'12:05'},{'bell':'Transition','time':'13:00'},{'bell':'4','time':'13:05'},
			{'bell':'Recess','time':'14:00'},{'bell':'5','time':'14:20'},{'bell':'End of Day','time':'15:15'}
		]
	};

function getSHSAPI(path, token, params, post, cb) {
	'use strict';
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
	'belltimes': function(opts, sessID, cb) {
		'use strict';
		if ('date' in opts) {
			opts.date = opts.date.replace('-0', '-');
		}
		else {
			var d = new Date();
			opts.date = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
		}

		if (opts.date in  bellsCache) {
			cb(bellsCache[opts.date]);
			return;
		}
		getSHSAPI('/api/timetable/bells.json', '', opts, false, function(obj) {
			var shortDow = obj.day.toLowerCase().substr(0,3);
			if (obj.bellsAltered) {
				var normal = normalBells[shortDow];
				for (var i in obj.bells) {
					if (normal[i].time != obj.bells[i].time) {
						obj.bells[i].different = true;
						obj.bells[i].normally = normal[i].time;
					}
				}
			}
			var js = JSON.stringify(obj);
			var et = etag.syncText(js);
			bellsCache[opts.date] = { 'json': js, 'etag': et };
			cb(bellsCache[opts.date]);
		});
	},
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
