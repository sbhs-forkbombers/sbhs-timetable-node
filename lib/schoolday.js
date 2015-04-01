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
var moment = require('moment');
var getAPI = require('./api')._getAPI;
var util = require('util');
var holidays = false;
var terms = {};
var lastYearUpdate = moment().year();
var currentTermEnd = moment();

function calculateHolidays() {
	var term;
	var inTerm = false;
	for (term in terms.terms) {
		var info = terms.terms[term];
		if (moment().isAfter(moment(info.start.date, 'YYYY-MM-DD')) && moment().isBefore(moment(info.end.date, 'YYYY-MM-DD'))) {
			inTerm = true;
			currentTermEnd = moment(info.end.date, 'YYYY-MM-DD').hours(15).minutes(15);
			break;
		}
	}
	holidays = !inTerm;
}
function init() {
	getAPI('/api/calendar/terms.json', null, {}, function(status, data) {
		if (status != 200) {
			// cri
			console.log('error happened :( more info: ' + data);

			throw new Error('couldn\'t get terms.json, sbhs is down?');
		}
		terms = data;
		calculateHolidays();
		lastYearUpdate = moment().year();
	});
}

function isHolidays() {
	if (moment().year() != lastYearUpdate) {
		init();
	}
	if (moment().isAfter(currentTermEnd)) {
		calculateHolidays();
	}
	return holidays;
}

module.exports.isHolidays = isHolidays;

init();