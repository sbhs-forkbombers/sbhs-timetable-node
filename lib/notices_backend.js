/*
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
var jsdom = require('jsdom');
module.exports = {
	notices: {},
	get: function notices_get(date, callback) {
        'use strict';
		if (date.toString('yyyy-MM-dd') in notices) {
			callback(notices[date.toString('yyyy-MM-dd')]);
			return;
		}
		jsdom.env('http://staff.sbhs.net.au/dailynotices?view=list&type=popup&date='+date.toString('yyyy-MM-dd'),
				[],
				function (errors, window) {
					var res = [],
						byYearGroup = {7: [], 8: [], 9: [], 10: [], 11: [], 12: [], 'staff': []},
						idx = 0,
						i, j, k;
					// cue intense DOM traversal
					var document = window.document,
						noticeBrace = document.getElementsByClassName('notice-brace')[1],
						rows = noticeBrace.getElementsByTagName('tr'),
						entry, appl, title, author, body, item, prettyAppl;
					console.log('Got ' + rows.length + ' notices');
					for (i in rows) {
						if (rows.hasOwnProperty(i)) {
							entry = rows[i];
							appl = entry.className.replace('meeting','').trim().split(' ');
							prettyAppl = entry.children[0].children[0].innerHTML.trim(); // <div class='notice-application'>
							item = entry.children[1]; // <div class='notice-item'>
							title = item.children[0].innerHTML.trim(); // <div class='notice-title'>
							k = item.children[1].getElementsByTagName('b');
							author = k[k.length - 1].innerHTML.trim(); // the last <b> (aka the author)
							body = item.children[1].innerHTML.trim().replace('<p><b>' + k[k.length-1].innerHTML + '</b></p>', ''); // <div class='notice-content'>
							res[idx] = {
								'title': title,
								'applicability': appl,
								'displayAppl': prettyAppl,
								'meeting': (entry.className.search('meeting') > -1),
								'body': body,
								'author': author
							};
							for (j in appl) {
								if (appl.hasOwnProperty(j)) {
									k = appl[j].split('-')[1];
									if (k != 'staff') {
										k = Number(k);
									}
									byYearGroup[k].push(idx);
								}
							}
							idx++;
						}
					}
					module.exports.notices[date.toString('yyyy-MM-dd')] = { 'notices': res, 'years': byYearGroup };
					callback({notices: res, years: byYearGroup});
				}
		);
	}
};


		

