/* SBHS-Timetable-Node: Countdown and timetable all at once (NodeJS app).
 * Copyright (C) 2014 James Ye,  Simon Shields
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

var timetable,
	belltimes,
	year,
	dateOffset = -1,
	needMidnightCountdown = false,
	reloading = false,
	currentBellIndex = -1, // next bell
	nextStart,
	manualOverride = 0, // manual date offset for public holidays etc (should cap at some number, TODO)
	topExpanded = false,
	leftExpanded = false,
	rightExpanded = false,
	bottomExpanded = false,
	miniMode = window.innerWidth < 800,
	bellsCached = false,
	timetableCached = false,
	noticesCached = false;

function updateSidebarStatus() {
	'use strict';
	var tick = '<span class="ok">✓</span>',
		cross = '<span class="notok">⤬</span>',
		cached = '<span class="stale">!</span>',
		loading = '<span class="idk">…</span>';
	var belltimesOK = window.hasOwnProperty('belltimes'),
		noticesOK = window.notices && window.notices.notices && !window.notices.notices.failure,
		timetableOK = window.hasOwnProperty('todayNames') && todayNames.timetable && !todayNames.timetable.failure,
		belltimesClass = 'ok',
		belltimesText = 'OK',
		timetableClass = 'notok',
		timetableText = 'Not OK',
		noticesClass = 'notok',
		noticesText = 'Not OK',
		shortText = ['B: '+tick,'T: '+cross,'N: '+cross];

	if (!belltimesOK) {
		belltimesText = 'Not OK';
		belltimesClass = 'notok';
		shortText[0] = 'B: ' + cross;
	}
	
	if (timetableCached) {
		timetableText = 'Cached';
		timetableClass = 'stale';
		shortText[1] = 'T: ' + cached;
	}
	else if (timetableOK) {
		timetableText = 'OK';
		timetableClass = 'ok';
		shortText[1] = 'T: ' + tick;
	}
	
	if (noticesCached) {
		noticesText = 'Cached';
		noticesClass = 'stale';
		shortText[2] = 'N: ' + cached;
	}
	else if (noticesOK) {
		noticesText = 'OK';
		noticesClass = 'ok';
		shortText[2] = 'N: ' + tick;

	}
	
	var bells = document.getElementById('belltimes');
	bells.className = belltimesClass;
	bells.innerHTML = belltimesText;
	var timetable = document.getElementById('timetable');
	timetable.className = timetableClass;
	timetable.innerHTML = timetableText;
	var notices = document.getElementById('notices');
	notices.className = noticesClass;
	notices.innerHTML = noticesText;
	document.getElementById('shortdata-desc').innerHTML = shortText.join(' ');
	
}

function collapsePane(p) {
	'use strict';
	var el = $('#'+p+'-pane');
	var cfg = {};
	cfg[p] = '-110%';
	el.velocity(cfg, 1000, 'ease');
	$('#'+p+'-pane-arrow').removeClass('expanded');
	window[p+'Expanded'] = false;
}

function expandPane(p) {
	'use strict';
	var el = $('#'+p+'-pane');
	var cfg = {};
	cfg[p] = 0;
	el.velocity(cfg, 1000, 'ease');
	window[p+'Expanded'] = true;
	$('#'+p+'-pane-arrow').addClass('expanded');
}

function togglePane(which) {
	'use strict';
	if (window[which+'Expanded']) {
		collapsePane(which);
	}
	else {
		expandPane(which);
	}
}

/** calculate the day that school will be starting on - this may NOT use DateJS functions as it may be called before DateJS is loaded. */
function calculateDay() {
	'use strict';
	var date = new Date(),
		dayOffset = 0,
		schoolEnd = new Date();
	schoolEnd.setHours(15, 15);
	if (date.getDay() === 5 && date > schoolEnd) { // Friday
		dayOffset += 2; // push to Sunday at this time.
		needMidnightCountdown = true;
	} else if (date.getDay() === 6 ) { // Saturday
		dayOffset += 1; // same as above
		needMidnightCountdown = true;
	} else if (date.getDay() === 0 || date > schoolEnd) { // Sunday
		needMidnightCountdown = true;
	}
	date.setDate(date.getDate() + dayOffset + manualOverride);
	dateOffset = dayOffset;
}

/** returns midnight ON the next school day */
function getNextSchoolDay() {
	'use strict';
	if (dateOffset == -1) {
		calculateDay();
	}
	var res = new Date();
	res.setDate(res.getDate() + dateOffset + manualOverride + (needMidnightCountdown ? 1 : 0));
	res.setHours(0,0,0);
	return res;
}

/** returns the CURRENT TIME in dateOffset days */
function getDateOffsetDate() {
	'use strict';
	if (dateOffset == -1) {
		calculateDay();
	}
	var res = new Date();
	res.setDate(res.getDate() + dateOffset + manualOverride);
	return res;
}

function reloadBelltimes() {
	'use strict';
	reloading = true;
	var d = getNextSchoolDay();
	var s = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
	var myXHR = new XMLHttpRequest();
	myXHR.onload = handleBells;
	myXHR.open('get', '/api/belltimes?date=' + s, handleBells);
	myXHR.send();
	//$.getJSON('/api/belltimes?date=' + getNextSchoolDay().toString('yyyy-MM-d'), handleBells);
}

function handleBells(bells) {
	/* jshint validthis: true */
	'use strict';
	belltimes = JSON.parse(this.responseText);
	if (belltimes.status === 'Error') {
		manualOverride++;
		if (manualOverride > 5) {
			document.getElementById('period-label').innerHTML = 'WAT?!?';
			console.error('No bells for more than five days in a row, SBHS might be down!');
			return;
		}
		document.getElementById('period-label').innerHTML = 'One sec…';
		reloadBelltimes();
		return;
	}
	setTimeout(loadTimetable, 0); // now that the belltimes are done, we can load the subject info
	setTimeout(loadNotices, 0);
	if (document.readyState == 'complete') {
		loadComplete();
	}
}

reloadBelltimes(); // do it ASAP

function domReady() {
	'use strict';
	if (document.readyState != 'complete') {
		return;
	}
	if (belltimes !== null && belltimes !== undefined) {
		setTimeout(loadComplete, 0);
	}
	if (getLoggedIn()) {
		$('#login-status').html('Logged in. <a href="/logout">Logout</a>');
	}
	else {
		$('#login-status').html('<a href="/try_do_oauth">Login');
	}
	
	$('#left-pane-arrow').click(function() {
		if (topExpanded) {
			collapsePane('top');
		}
		togglePane('left');
	});

	$('#top-pane-arrow').click(function() {
		if (leftExpanded) {
			collapsePane('left');
		}
		if (rightExpanded) {
			collapsePane('right');
		}
		togglePane('top');
	});
	
	$('#right-pane-arrow').click(function() {
		if (topExpanded) {
			collapsePane('top');
		}
		togglePane('right');
	});
	
	$('#cached').click(function() {
		var $arrow = $(document.getElementById('dropdown-arrow'));
		if ($arrow.hasClass('expanded')) {
			$('#verbose-hidden').velocity('slideUp');
			$arrow.removeClass('expanded');
		}
		else {
			$('#verbose-hidden').velocity('slideDown');
			$arrow.addClass('expanded'); // can't velocify this.
		}
	});
	
	setTimeout(function() {
		$('#update').velocity('fadeOut');
	}, 10000);
	
	if (miniMode) {
		
	}
}

function loadComplete() {
	'use strict';
	reloading = false;
	calculateUpcomingLesson();
	updateCountdownLabel();
	handleRightPane();
	setInterval(updateCountdownLabel, 1000);
	updateSidebarStatus();
}

function prettifySecondsLeft(sec) {
	'use strict';
	var secs, mins, hrs;
	secs = sec % 60;
	sec -= sec % 60;
	sec /= 60;
	mins = sec % 60;
	sec -= sec % 60;
	sec /= 60;
	hrs = sec;
	if (secs < 10) {
		secs = '0' + secs;
	}
	if (mins < 10) {
		mins = '0' + mins;
	}
	if (hrs === 0) {
		hrs = '';
	} else if (hrs < 10) {
		hrs = '0' + hrs;
	}
	return (hrs !== '' ? hrs + 'h ' : '') + mins + 'm ' + secs + 's';
}

function calculateUpcomingLesson() {
	'use strict';
	reloading = true;
	var i, lastOK = 0, bell, bdate, nextBell, now;
	if (belltimes === null) {
		reloadBelltimes();
		reloading = false;
		return;
	}
	if ((new Date()).isAfter(Date.today().set({hour: 15, minute: 15})) || getNextSchoolDay().valueOf() != Date.today().valueOf()) {
		now = getNextSchoolDay();
	} else {
		now = new Date();
	}
	for (i in belltimes.bells) {
		bell = belltimes.bells[i].time.split(':');
		bdate = now.clone().set({hour: Number(bell[0]), minute: Number(bell[1]), second: 0});
		if ((nextBell === undefined || nextBell.isAfter(bdate)) && bdate.isAfter(new Date())) {
			nextBell = bdate;
			lastOK = i;
		}
	}
	if (nextBell === undefined) {
		calculateDay();
		reloadBelltimes();
	}
	currentBellIndex = Number(lastOK);
	nextStart = nextBell;
	reloading = false;
	setTimeout(updatePeriodLabel, 100); // async
}

function updatePeriodLabel() {
	'use strict';
	var name = belltimes.bells[currentBellIndex].bell,
		inLabel = 'starts in', pNum, roomChangedInfo, hasCover, hasCasual;
	name = name.replace('Roll Call', 'School Starts').replace('End of Day', 'School Ends');
	if (/^\d$/.test(name)) { // 'Period x' instead of 'x'
		pNum = name;
		if (name in window.todayNames.timetable) {
			name = window.todayNames.timetable[name].fullName;
		}
		else {
			name = 'Period ' + name;
		}
	} else if (name == 'Transition') {
		pNum = belltimes.bells[currentBellIndex-1].bell;
		if (pNum in window.todayNames.timetable) {
			name = window.todayNames.timetable[belltimes.bells[currentBellIndex-1].bell].fullName;
		}
		else {
			name = 'Period ' + belltimes.bells[currentBellIndex - 1].bell;
		}
		inLabel = 'ends in';
	} else if (name == 'School Starts' || name == 'School Ends') {
		inLabel = 'in';
	}
	else {
		if (/^\d$/.test(belltimes.bells[currentBellIndex-1].bell)) {
			pNum = belltimes.bells[currentBellIndex-1].bell;
			inLabel = 'end in';
			name = 'Period ' + pNum;
		}
	}
	
	roomChangedInfo = '';
	if (pNum && window.todayNames && pNum in window.todayNames.timetable && window.todayNames.timetable[pNum].changed) {
		pNum = window.todayNames.timetable[pNum];
		if ('roomTo' in pNum) {
			if (!miniMode) {
				roomChangedInfo = name + ' is in room ' + pNum.roomTo + ' instead of ' + pNum.roomFrom + '. ';
			}
			else {
				roomChangedInfo = 'Room: ' + pNum.roomTo + ' ';
			}
		}
		if ('hasCover' in pNum) {
			if (pNum.hasCover && pNum.hasCasual) { // casual teacher
				if (!miniMode) {
					roomChangedInfo += 'You\'ll be having ' + pNum.casualDisplay + ' instead of your usual teacher.';
				}
				else {
					roomChangedInfo += 'Casual: ' + pNum.casualDisplay;
				}
			}
			else if (!pNum.hasCover) { // no teacher
				if (!miniMode) {
					roomChangedInfo += 'There\'s no teacher covering this class today (we think).';
				}
				else {
					roomChangedInfo += 'No teacher (maybe)';
				}
			}
		}
	}
	$('#period-label').text(name);
	$('#in-label').text(inLabel);
	$('#top-line-notice').text(roomChangedInfo);
}

function updateCountdownLabel() {
	'use strict';
	if (reloading) {
		return;
	}
	if (nextStart === null) {
		calculateUpcomingLesson();
		return;
	}
	var now = new Date(),
		left = nextStart - now;
	if (left < 0) {
		calculateUpcomingLesson();
		return;
	}
	left = nextStart - now;
	$('#countdown-label').text(prettifySecondsLeft(Math.floor(left/1000)));
}

function handleRightPane() {
	'use strict';
	var bells = belltimes.bells;
	var res = '<table><tbody>';
	for (var i in bells) {
		var bell = bells[i].bell;
		var rowClass = 'break';
		if (/^\d$/.test(bell)) {
			rowClass = 'period';
			bell = 'Period ' + bell;
		}
		res += '<tr class="'+rowClass+'"><td class="bell">'+bell+'</td><td class="time">'+bells[i].time+'</td></tr>';
	}
	res += '</tbody></table>';
	document.getElementById('right-pane').innerHTML = res;
}

document.addEventListener('readystatechange', domReady);
