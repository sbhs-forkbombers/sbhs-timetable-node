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

function handleLeftPane() {
	/* Fill out the left pane */
	'use strict';
	var pane = document.getElementById('left-pane'),
		html = '<table><tbody><tr><td>Subject</td><td>Teacher</td><td>Room</td></tr>',
		timetable = todayNames.timetable,
		prefix, subj, suffix, room, teacher, fullTeacher, subjName, final,
		roomChanged, teacherChanged, cancelled = false;
	if (window.timetableCached) {
		html = '<div class="cached-notice">This data may be outdated</div>' + html;
	}
	for (var i = 1; i < 6; i++) {
		if (!(i in timetable) || !timetable[i].room) {
			html += '<tr class="free"><td>Free</td><td></td><td></td></tr>';
		}
		else {
			prefix = '';
			subj = '';
			suffix = '';
			subj = timetable[i].title;
			room = timetable[i].room;
			teacher = timetable[i].teacher;
			fullTeacher = timetable[i].fullTeacher;
			subjName = timetable[i].fullName;
			final = timetable.variationsFinalised;
			if (/\d$/.test(timetable[i].title) || /[a-z][A-Z]$/.test(timetable[i].title)) {
				suffix = timetable[i].title.substr(-1);
				subj = subj.slice(0,-1);
			}
			if (subj.length == 3 || (subj.length == 2 && suffix === '') || /^[WXYZ]/.test(subj)) { // very tentative guess that this is an elective - char 1 should be prefix
				prefix = subj[0];
				subj = subj.substr(1);
			}
			if (timetable[i].changed) {
				if (timetable[i].hasOwnProperty('hasCover') && timetable[i].varies) { // don't show anything because I really don't get what the point of setting a casual but then not actually using aforementioned casual is.
					if (!timetable[i].hasCover) {
						cancelled = true;
					}
					else if (timetable[i].hasCasual) {
						teacherChanged = true;
						teacher = timetable[i].casual.toUpperCase();
						fullTeacher = timetable[i].casualDisplay.trim();
					}
				}
				if (timetable[i].roomFrom) {
					roomChanged = true;
					room = timetable[i].roomTo;
				}
			}

			html += '<tr'+(cancelled?' class="cancelled"':'')+'><td title="'+subjName+'">'+timetable[i].year+prefix+'<strong>'+subj+'</strong>'+suffix+'</td><td '+(teacherChanged?'class="changed'+(!final?' changeable" ':'" '):'')+'title="'+fullTeacher+'">'+teacher+'</td><td'+(roomChanged?' class="changed' + (!final?' changeable"':'"'):'')+'>'+room+'</td></tr>';
			cancelled = false;
			roomChanged = false;
			teacherChanged = false;
		}
	}
	html += '</tbody></table><div class="changeable-status">';
	if (todayNames.variationsFinalised) {
		html += 'This info is final</div>';
	}
	else {
		html += 'This info may change</div>';
	}
	pane.innerHTML = html;

}

function getLoggedIn() {
	/* Are you logged in? */
	'use strict';
	return window.loggedIn;
}

function handleTimetable(e) {
	/* Fill out the timetable */
	'use strict';
	/* jshint validthis: true */
	window.timetableCached = false;
	var lsKey = belltimes.day + belltimes.weekType;
	var res = JSON.parse(this.responseText);
	if (res.timetable && !res.hasVariations) {
		window.localStorage[lsKey] = this.responseText;
	}
	else if (!res.timetable) {
		$('#rtd-unavailable').html('Real-time data inaccessible');
		return; // we don't want to do that... TODO refresh access token and stuff
	}
	window.todayNames = res;
	$('#rtd-unavailable').html('Loaded real-time data!');
	setTimeout(function() {
		$('#rtd-unavailable').fadeOut();
		setTimeout(function() { $('#rtd-unavailable').html('').css({'display': 'block'}); }, 1000);
	}, 3000);
	if (currentBellIndex == -1) {
		calculateUpcomingLesson();
	}
	handleLeftPane();
	updatePeriodLabel();
	updateSidebarStatus();
}

function loadTimetable() {
	/* Get the timetable */
	'use strict';
	window.timetableCached = false;
	if ((belltimes.day+belltimes.weekType) in window.localStorage) {
		window.timetableCached = true;
		console.log('loading from localStorage');
		window.todayNames = JSON.parse(window.localStorage[belltimes.day+belltimes.weekType]);
		setTimeout(handleLeftPane, 0);
		updateSidebarStatus();
		$('#rtd-unavailable').html('Loading real-time data...');
	}
	else if (!getLoggedIn() && !window.todayNames) {
		console.log('umm');
		window.todayNames = {timetable: {failure: true}};
	}
	if (!getLoggedIn()) {
		$('#rtd-unavailable').html('<a href="/try_do_oauth">Login</a> to use real-time data');
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.onload = handleTimetable;
	xhr.open('GET', '/api/today.json?stupid_proxy_caching_is_stupid', true);
	xhr.send();
}
