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

module.exports = {};

var COLOURS = {
	'purple': {
		'fg': '#b388ff',
		'bg': '#000000',
		'highBg': '#fff9c4',
		'highFg': '#8bc34a'
	},
	'default': {
		'fg': '#ffffff',
		'bg': '#000000',
		'highBg': '#e51c23',
		'highFg': '#ffc107'
	},
	'red': {
		'fg': '#e84e40',
		'bg': '#000000',
		'highBg': '#5af158',
		'highFg': '#cddc39'
	},
	'green': {
		'fg': '#8bc34a',
		'bg': '#000000',
		'highBg': '#bf360c',
		'highFg': '#76ff03',
	}
};

module.exports.get = function(name, invert) {
	'use strict';
	var res = COLOURS.default;
	if (name in COLOURS) {
		res = COLOURS[name];
	}
	if (invert === true) {
		return {
			'fg': res.bg,
			'bg': res.fg,
			'highBg': res.highFg,
			'highFg': res.highBg
		};
	}
	return res;

};

module.exports.getFromUriQuery = function(query) {
	'use strict';
	var defs = COLOURS.default;
	var res = {};
	for (var i in defs) {
		if (i in query) {
			res[i] = query[i];
			if (res[i][0] == '#') {
				res[i] = res[i].substr(1);
			}
		}
		else {
			res[i] = defs[i];
		}
	}
	return res;
};
