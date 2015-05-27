/* SBHS-Timetable-Node: Countdown and timetable all at once (NodeJS app).
 * Copyright (C) 2015 James Ye, Simon Shields
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
var rightExpanded = false,
	leftExpanded = false,
	topExpanded = false;
// TODO rewrite this entire file to be better
function handleLeftPane() {
	/* Fill out the left pane */
	'use strict';
	if (!window.today || window.today.httpStatus != 200) return;
	var pane = document.getElementById('left-pane'),
		html = '<table><tbody><tr><td>Subject</td><td>Teacher</td><td>Room</td></tr>',
		timetable = today.timetable,
		prefix, subj, suffix, room, teacher, fullTeacher, subjName, finalised,
		roomChanged, teacherChanged, cancelled = false;
	if (window.today.stale) {
		html = '<div class="cached-notice">This data may be outdated</div>' + html;
	}
	for (var i = 1; i < 6; i++) {
		if (!(i in timetable) || !timetable[i].room) {
			html += '<tr class="free"><td>Free</td><td></td><td></td></tr>';
		}
		else {
			today.timetable[i].expanded = false;
			prefix = '';
			subj = '';
			suffix = '';
			subj = timetable[i].title;
			room = timetable[i].room;
			teacher = timetable[i].teacher;
			fullTeacher = timetable[i].fullTeacher;
			subjName = timetable[i].fullName;
			finalised = today.displayVariations || today.variationsFinalised || window.location.search.indexOf('Z01DB3RGGG') != -1;
			if (/\d$/.test(timetable[i].title) || /[a-z][A-Z]$/.test(timetable[i].title)) {
				suffix = timetable[i].title.substr(-1);
				subj = subj.slice(0,-1);
			}
			if (/*subj !== 'SDs' /* Software design special case  && subj.length == 3 /*|| (subj.length == 2 && suffix === '') ||*/ /^[WXYZ]/.test(subj)) { // very tentative guess that this is an elective - char 1 should be prefix
				prefix = subj[0];
				subj = subj.substr(1);
			}		
			if (subj.length == 3) {
				if (/[A-Z0-9]/.test(subj.substr(-1))) {
					suffix = subj.substr(-1);
					subj = subj.slice(0, -1);
				}
			}
			if (timetable[i].changed && finalised) {
				if (timetable[i].varies) { 
					if (timetable[i].cancelled) {
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
			if (/^(Mr|Ms|Dr) /.test(fullTemp)) {
				fullTemp = fullTemp.split(' ').slice(1).join(' ');
			}
			if (fullTemp[0].toLowerCase() !== teacher[0].toLowerCase()) {
				// probably a split class, no expandability because otherwise it's broken
				fullTemp = teacher;
			}
			fullTemp = fullTemp.replace(' ', '&nbsp;');
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
			html += '<tr'+(cancelled?' class="cancelled changed"':'')+'><td class="subject" title="'+subjName+'" onclick="expandSubject(event,'+i+')">'+timetable[i].year+prefix+'<strong>'+nSubj+'</strong>'+suffix+'</td><td class="teacher'+(teacherChanged?' changed'+(!finalised?' changeable':''):'')+'" title="'+fullTeacher+'" onclick="teacherExpand(event,'+i+')">'+nTeach+'</td><td'+(roomChanged?' class="changed' + (!finalised?' changeable"':'"'):'')+'>'+room+'</td></tr>';
			cancelled = false;
			roomChanged = false;
			teacherChanged = false;
		}
	}
	html += '</tbody></table>';
	pane.innerHTML = html;
}

function expandSubject(event, id) {
	'use strict';
	if (today.timetable[id].expanded) {
		$('.subj-expand', event.currentTarget.parentNode).velocity('stop').velocity('transition.slideLeftBigOut');
		today.timetable[id].expanded = false;
	}
	else {
		$('.subj-expand', event.currentTarget.parentNode).velocity('stop').velocity('transition.slideLeftBigIn');
		today.timetable[id].expanded = true;
	}
}

function teacherExpand(event, id) {
	'use strict';
	var el = event.currentTarget.parentNode;
	if (el.tagName.toLowerCase() === 'span') {
		el = el.parentNode;
	}
	if (today.timetable[id].teachExpanded) {
		$('.teach-expand', el).velocity('stop').velocity('transition.slideLeftBigOut');
		today.timetable[id].teachExpanded = false;
	}
	else {
		$('.teach-expand', el).velocity('stop').velocity('transition.slideLeftBigIn');
		today.timetable[id].teachExpanded = true;
	}
}

EventBus.on('today', handleLeftPane);


// notices
function handleTopPane() {
	'use strict';
	var entry, list, today = new Date(), res = '', j, i, date, dom, wday, month,
		weekdays = 'Sunday Monday Tuesday Wednesday Thursday Friday Saturday'.split(' '),
		months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
	if (!window.notices || !window.notices.notices) {
		return;
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
	date = (window.notices.date ? window.notices.date : belltimes.date);
	date = moment(date, 'YYYY-MM-DD');
	wday = date.format('dddd');
	dom = date.format('DD');
	month = date.format('MMM');
	if (window.notices.date !== null) {
		res += '<h1 class="notices-header">Notices for ' + wday + ' ' + dom + ' ' + month + ' &mdash; Week ' + window.notices.week + '</h1><table><tbody>';
	} else {
		res += '<h1 class="notices-header">Notices for ' + wday + ' ' + dom + ' ' + month + ' &mdash; Week ' + belltimes.week + belltimes.weekType + '</h1><table><tbody>';
	}
	if (window.barcodenews && window.barcodenews.content.current.length > 0) {
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
		if (!sorted.hasOwnProperty(i)) continue;
		list = window.notices.notices[sorted[i]];
		for (j in list) {
			if (!list.hasOwnProperty(j)) continue;
			entry = list[j];
			res += '<tr id="'+entry.id+'" class="notice notice' + entry.years.join(' notice') + ' notice-row ' + (entry.isMeeting ? 'meeting' : '') + '">';
			res += '<td class="notice-target animated">'+entry.dTarget+'</td>';
			res += '<td class="notice-data"><h2 class="notice-title">'+entry.title+'</h2><div class="notice-hidden" id="n'+entry.id+'-hidden">';
			if (entry.isMeeting) {
				date = moment(entry.meetingDate, 'YYYY-MM-DD');
				wday = date.format('dddd');
				month = date.format('MMM');
				dom = date.format('DD');
				res += '<div class="notice-meeting"><strong>Meeting Date:</strong> ' + wday + ', ' + month + ' ' + dom + ' ' + date.format('YYYY') + '<br />';
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

EventBus.on('notices', handleTopPane);
EventBus.on('barcodenews', handleTopPane);

// bells

function handleRightPane() {
	/* Fill out the right pane */
	'use strict';
	var bells = belltimes.bells, rowClass, bell, timeClass;
	var res = '<table><tbody>';
	for (var i in bells) {
		if (!bells.hasOwnProperty(i)) {
			continue;
		}
		bell = bells[i].bell;
		timeClass = 'bell';
		rowClass = 'break';
		if (/^\d$/.test(bell)) {
			rowClass = 'period';
			bell = 'Period ' + bell;
		}
		if (bells[i].different) {
			timeClass += ' changed" title="normally ' + bells[i].normally;
		}
		res += '<tr class="'+rowClass+'"><td class="bell">'+bell+'</td><td class="'+timeClass+'">'+bells[i].time+'</td></tr>';
	}
	res += '</tbody></table>';
	document.getElementById('right-pane').innerHTML = res;
}

EventBus.on('bells', handleRightPane);
