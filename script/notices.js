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
/* globals belltimes, getDateString, getLoggedIn, updateSidebarStatus */ /* jshint -W098 */

function handleTopPane() {
	'use strict';
	var entry, list, today = new Date(), res = '', j, i;
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
	res += '<select id="notices-filter">';
	res += '<option value="notice">All notices</option>';
	for (i = 7; i <= 12; i++) {
		res += '<option value="notice'+i+'">Year ' + i + '</option>';
	}
	res += '<option value="noticeStaff">Staff</option></select>';
	if (window.notices.date !== null) {
		res += '<h1 class="notices-header">Notices for ' + window.notices.date + ' (Week ' + window.notices.week + ')</h1><table><tbody>';
	} else {
		res += '<h1 class="notices-header">Notices for ' + belltimes.date + ' (Week ' + belltimes.week + belltimes.weekType + ')</h1><table><tbody>';
	}
	if (window.barcodenews) {
		res += '<tr id="barcodenews" class="notice-row barcodenews" style="line-height: 1.5">';
		res += '<td class="notice-target animated">All Students and Staff</td>';
		res += '<td class="notice-data"><h2 class="notice-title">Today\'s Barcode News</h2><div class="notices-hidden" id="nbarcodenews-hidden">';
		res += '<div id="nbarcodenews-txt" class="notice-content">';
		for (j in window.barcodenews.content.current) {
			list = window.barcodenews.content.current[j];
			res += '<strong>';
			if (list.years[0] !== 'all' && list.years.length > 1) {
				res += 'Years ' + list.years.join(', ');
			}
			else if (list.years[0] !== 'all' && list.years.length == 1) {
				res += 'Year ' + list.years[0];
			}
			else {
				res += 'Everyone';
			}
			res += '</strong>';
			res +=': ' + list.content + '<br />';
		}
		res += '</div></div></td></tr>';
	}
	for (i in sorted) {
		list = window.notices.notices[sorted[i]];
		for (j in list) {
			entry = list[j];
			res += '<tr id="'+entry.id+'" class="notice notice' + entry.years.join(' notice') + ' notice-row ' + (entry.isMeeting ? 'meeting' : '') + '">';
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
		if (!el.hasClass('velocity-animating')) {
			if (el.hasClass('notice-hidden')) {
				el.velocity('stop').removeClass('notice-hidden').velocity('slideDown');
			}
			else {
				el.velocity('stop').velocity('slideUp').addClass('notice-hidden');
			}
		}
	});

	$('#notices-filter').change(function() {
		/*jshint validthis: true*/
		console.log('change!');
		var val = this.value;
		$('.notice').velocity('fadeOut');
		$('.'+val).velocity('stop').velocity('fadeIn');
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

function handleBarcodeNews() {
	/*jshint validthis: true */
	'use strict';
	var res = JSON.parse(this.responseText);
	if (res.content) {
		window.barcodenews = res;
		handleTopPane();
	}
}

function loadBarcodeNews() {
	'use strict';
	var xhr;
	var ds = getDateString();

	if (getLoggedIn()) {
		xhr = new XMLHttpRequest();
		xhr.onload = handleBarcodeNews;
		xhr.open('GET', '/api/barcodenews.json?date='+ds, true);
		xhr.send();
	}
}

function loadNotices() {
	'use strict';
	window.noticesCached = false;
	var lsKey = new Date().toDateString();
	var ds = getDateString();
	console.log(ds);
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
	loadBarcodeNews();
}


