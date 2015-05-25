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
var fs = require('fs');
var holidays = false;
var terms = {};
var lastYearUpdate = moment().year();
var currentTermEnd = moment();

function calculateHolidays() {
	var term;
	var inTerm = false;
	for (term in terms.terms) {
		var info = terms.terms[term];
		if (moment().isAfter(moment(info.start.date, 'YYYY-MM-DD').day(-2).hours(9).minutes(5)) && moment().isBefore(moment(info.end.date, 'YYYY-MM-DD').hours(15).minutes(15))) {
			inTerm = true;
			currentTermEnd = moment(info.end.date, 'YYYY-MM-DD').hours(15).minutes(15);
			break;
		}
		else if (moment().isBefore(moment(info.start.date, 'YYYY-MM-DD').hours(9).minutes(5).day(-2))) { // 9.05 am friday
			inTerm = false;
			currentTermEnd = moment();
			break;
		}
	}
	holidays = !inTerm;
}

function termsRead(data) {
		terms = data;
		fs.writeFile('terms_cache.json', JSON.stringify(data), function (err) {
			if (err) {
				console.warn('[term_get] failed to cache term info: ', err.stack);
			} else {
				console.log('[term_get] cached term info successfully');
			}
		});
		calculateHolidays();
		lastYearUpdate = moment().year();
}

function init() {
	getAPI('/api/calendar/terms.json', null, {}, function(status, data) {
		if (status != 200) {
			// cri
			fs.exists('terms_cache.json', function(exists) {
				if (exists) {
					fs.readFile('terms_cache.json', function(err, data) {
						if (err) {
							// ok now die
							throw err;
						}
						termsRead(JSON.parse(data));

					});
				}
			});
		} else {
			termsRead(data);
		}

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
