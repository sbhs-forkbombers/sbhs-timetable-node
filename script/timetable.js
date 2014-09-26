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
/* global belltimes, todayNames, currentBellIndex, calculateUpcomingLesson, updatePeriodLabel, updateSidebarStatus */ /* jshint -W098 */

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
			todayNames.timetable[i].expanded = false;
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
			if (subj.length == 3 /*|| (subj.length == 2 && suffix === '')*/ || /^[WXYZ]/.test(subj)) { // very tentative guess that this is an elective - char 1 should be prefix
				prefix = subj[0];
				subj = subj.substr(1);
			}
			if (timetable[i].changed && todayNames.variationsFinalised) {
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
			var nSubj = '';
			var idx = 0;

			for (var j = 0; j < subj.length; j++) {
				var z = subjName.indexOf(subj[j+1]);
				z = z < 0 ? undefined : z;
				var mStr = subjName.substring(idx+1, z);
				nSubj += subj[j] + '<span class="subj-expand ' + (cancelled ? 'cancelled':'') + '">'+mStr+'</span>';
				idx = z;
			}
			var nTeach = '';
			idx = 0;
			var temp = teacher.toLowerCase();
			var fullTemp = fullTeacher;
			if (/^M(r|s) /.test(fullTemp)) {
				fullTemp = fullTemp.split(' ').slice(1).join(' ');
			}
			if (fullTemp[0].toLowerCase() !== teacher[0].toLowerCase()) {
				// we'll make up a prefix - probably a split class
				teacher = temp = fullTemp[0] + fullTemp.substr(-1);
				temp = temp.toLowerCase();
			}
			for (var k = 0; k < teacher.length; k++) {
				var y = fullTemp.toLowerCase().indexOf(temp[k+1]);
				y = y < 0 ? undefined : y;
				var extra = fullTemp.substring(idx+1, y);
				if (k !== 0) {
					nTeach += '<span class="small-caps">';
				}
				nTeach += (k === 0 ? teacher[k].toUpperCase() : teacher[k].toLowerCase()) + '<span class="teach-expand ' + (cancelled ? 'cancelled':'') + '">'+extra.toLowerCase()+'</span>';
				if (k !== 0) {
					nTeach += '</span>';
				}
				idx = y;
			}
			if (cancelled) {
				room = 'N/A';
			}
			html += '<tr'+(cancelled?' class="cancelled changed"':'')+'><td class="subject" title="'+subjName+'" onclick="expandSubject(event,'+i+')">'+timetable[i].year+prefix+'<strong>'+nSubj+'</strong>'+suffix+'</td><td class="teacher'+(teacherChanged?' changed'+(!final?' changeable':''):'')+'" title="'+fullTeacher+'" onclick="teacherExpand(event,'+i+')">'+nTeach+'</td><td'+(roomChanged?' class="changed' + (!final?' changeable"':'"'):'')+'>'+room+'</td></tr>';
			cancelled = false;
			roomChanged = false;
			teacherChanged = false;
		}
	}
	html += '</tbody></table>';
	// Variations should not be shown if not final
	/*html += '><div class="changeable-status">';
	if (todayNames.variationsFinalised) {
		html += 'This info is final</div>';
	}
	else {
		html += 'This info may change</div>';
	}*/
	pane.innerHTML = html;

}

function getLoggedIn() {
	/* Are you logged in? */
	'use strict';
	return window.loggedIn;
}

function expandSubject(event, id) {
	'use strict';
	if (todayNames.timetable[id].expanded) {
		$('.subj-expand', event.currentTarget.parentNode).velocity('stop').velocity('transition.slideLeftBigOut');
		todayNames.timetable[id].expanded = false;
	}
	else {
		$('.subj-expand', event.currentTarget.parentNode).velocity('stop').velocity('transition.slideLeftBigIn');
		todayNames.timetable[id].expanded = true;
	}
}

function teacherExpand(event, id) {
	'use strict';
	var el = event.currentTarget.parentNode;
	if (el.tagName.toLowerCase() === 'span') {
		console.log('#nope');
		el = el.parentNode;
	}
	if (todayNames.timetable[id].teachExpanded) {
		$('.teach-expand', el).velocity('stop').velocity('transition.slideLeftBigOut');
		todayNames.timetable[id].teachExpanded = false;
	}
	else {
		$('.teach-expand', el).velocity('stop').velocity('transition.slideLeftBigIn');
		todayNames.timetable[id].teachExpanded = true;
	}
}

function handleTimetable() {
	/* Fill out the timetable */
	'use strict';
	/* jshint validthis: true, -W041 */
	window.timetableCached = false;
	if (window.belltimes == null || belltimes.status === 'Error') {
		reloadBelltimes(); // use today.json's date.
	}
	var res = JSON.parse(this.responseText);
	if (window.belltimes != null) {
		var lsKey = belltimes.day + belltimes.weekType;
		if (res.timetable && !res.hasVariations) {
			window.localStorage[lsKey] = this.responseText;
		}
	}
	if (!res.timetable) {
		$('#rtd-status').html('Real-time data inaccessible');
		return; // we don't want to do that... TODO refresh access token and stuff
	}
	window.todayNames = res;
	$('#rtd-status').html('Loaded real-time data');
	setTimeout(function() {
		$('#rtd-status').velocity('fadeOut');
		setTimeout(function() { $('#rtd-status').velocity('fadeOut').html('').css({'display': 'block'}); }, 1000);
	}, 3000);
	if (currentBellIndex == -1) {
		calculateUpcomingLesson();
	}
	handleLeftPane();
	if (belltimes.status !== 'Error') {
		updatePeriodLabel();
	}
	updateSidebarStatus();
}

function loadTimetable() {
	/* Get the timetable */
	'use strict';
	window.timetableCached = false;
	if (belltimes && (belltimes.day+belltimes.weekType) in window.localStorage) {
		window.timetableCached = true;
		console.log('loading from localStorage');
		window.todayNames = JSON.parse(window.localStorage[belltimes.day+belltimes.weekType]);
		setTimeout(handleLeftPane, 0);
		updateSidebarStatus();
		$('#rtd-status').html('Loading real-time data…');
	}
	else if (!getLoggedIn() && !window.todayNames) {
		console.log('umm');
		window.todayNames = {timetable: {failure: true}};
	}
	if (!getLoggedIn()) {
		$('#rtd-status').html('<a href="/try_do_oauth">Log in</a> for real-time data');
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.onload = handleTimetable;
	xhr.open('GET', '/api/today.json?stupid_proxy_caching_is_stupid', true);
	xhr.send();
}
