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
/* globals belltimes, updateSidebarStatus, getNextSchoolDay, getLoggedIn */ /* jshint -W098 */

function handleTopPane() {
	'use strict';
	var entry, list, today = new Date(), res = '';
	if (!window.notices) {
		return;
	}
	if (window.noticesCached) {
		res += '<div class="cached-notice">These notices might be old</div>';
	}
	var sorted = Object.keys(window.notices.notices).sort(function(a,b) {
		if (a >  b) {
			return -1;
		}
		return 1;
	});
	if (window.notices.date !== null) {
		res += '<h1 class="notices-header">Notices for ' + window.notices.date + ' (Week ' + window.notices.week + ')</h1><table><tbody>';
	} else {
		res += '<h1 class="notices-header">Notices for ' + belltimes.date + ' (Week ' + belltimes.week + belltimes.weekType + ')</h1><table><tbody>';
	}
	for (var i in sorted) {
		list = window.notices.notices[sorted[i]];
		for (var j in list) {
			entry = list[j];
			res += '<tr id="'+entry.id+'" class="notice' + entry.years.join(' notice') + ' notice-row ' + (entry.isMeeting ? 'meeting' : '') + '">';
			res += '<td class="notice-target animated">'+entry.dTarget+'</td>';
			res += '<td class="notice-data"><h2 class="notice-title">'+entry.title+'</h2><div class="notice-hidden" id="n'+entry.id+'-hidden">';
			if (entry.isMeeting) {
				res += '<div class="notice-meeting"><strong>Meeting Date:</strong> ' + entry.meetingDate + '<br />';
				res += '<strong>Meeting Time:</strong> ' + entry.meetingTime + ' in ' + entry.meetingPlace + '<br /></div>';
			}
			res += '<div id="n'+entry.id+'-txt" class="notice-content">';
			res += entry.text + '</div><div class="notice-author">'+entry.author+'</div></div></td></tr>';
		}
	}
	res += '</tbody></table>';
	document.getElementById('top-pane').innerHTML = res;
	$('.notice-row').click(function() {
		/*jshint validthis: true*/
		var id = this.id;
		var el = $('#n'+id+'-hidden');
		if (el.hasClass('notice-hidden')) {
			el.velocity('stop').removeClass('notice-hidden').velocity('slideDown');
		}
		else {
			el.velocity('stop').velocity('slideUp').addClass('notice-hidden');
		}
	});

}

function handleNotices(err) {
	/*jshint validthis: true*/
	'use strict';
	window.noticesCached = false;
	var lsKey = new Date().toDateString();
	var res = JSON.parse(this.responseText);
	if (res.notices) {
		window.localStorage[lsKey] = this.responseText;
		window.notices = res;
		handleTopPane();
	}
	else if (!window.notices) {
		$('#top-pane').html('<h1><a href="javascript:void(0)" onclick="loadNotices()">Reload</a></h1>');
	}
	updateSidebarStatus();
}

function loadNotices() {
	'use strict';
	window.noticesCached = false;
	var lsKey = new Date().toDateString();
	var date = getNextSchoolDay();
	var ds = date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();
	if (lsKey in window.localStorage) {
		window.noticesCached = true;
		window.notices = JSON.parse(window.localStorage[lsKey]);
		updateSidebarStatus();
		handleTopPane();
	}
	else if (!getLoggedIn()) {
		window.notices = { 'notices': { 'failure': true } };
		return;
	}
	if (!getLoggedIn()) {
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.onload = handleNotices;
	xhr.open('GET', '/api/notices.json?date='+ds, true);
	xhr.send();
}
