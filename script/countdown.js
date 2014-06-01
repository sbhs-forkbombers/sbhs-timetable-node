/*
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
/*jshint latedef: nofunc */
var timetable,
	belltimes,
	year,
	dateOffset = -1,
	needMidnightCountdown = false,
	reloading = false,
	currentBellIndex = -1, // next bell
	nextStart;

/** returns midnight ON the next school day */
function getNextSchoolDay() {
	'use strict';
	if (dateOffset == -1) {
		calculateDay();
	}
	var res = new Date();
	res.setDate(res.getDate() + dateOffset + (needMidnightCountdown ? 1 : 0));
	return res;
}

/** returns the CURRENT TIME in dateOffset days */
function getDateOffsetDate() {
	'use strict';
	if (dateOffset == -1) {
		calculateDay();
	}
	var res = new Date();
	res.setDate(res.getDate() + dateOffset);
	return res;
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
	date.setDate(date.getDate() + dayOffset);
	dateOffset = dayOffset;
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
	loadTimetable(); // now that the belltimes are done, we can load the subject info
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
		loadComplete();
	} else {
//		reloadBelltimes();
	}
}

function loadComplete() {
	'use strict';
	reloading = false;
	calculateUpcomingLesson();
	setInterval(updateCountdownLabel, 1000);
}

function prettifySecondsLeft(sec) {
	'use strict';
	var secs, mins, hrs;
	secs = '' + sec % 60;
	sec -= sec % 60;
	sec /= 60;
	mins = '' + sec % 60;
	sec -= sec % 60;
	sec /= 60;
	hrs = '' + sec;
	if (secs.length == 1) {
		secs = '0' + secs;
	}
	if (mins.length == 1) {
		mins = '0' + mins;
	}
	if (hrs == '0') {
		hrs = '';
	} else if (hrs.length == 1) {
		hrs = '0' + hrs;
	}
	return (hrs !== '' ? hrs + 'h ' : '') + mins + 'm ' + secs + 's';
}

function calculateUpcomingLesson() {
	'use strict';
	reloading = true;
	var i, lastOK, bell, bdate, nextBell, now;
	if (belltimes === null) {
		reloadBelltimes();
		reloading = false;
		return;
	}
	if ((new Date()).isAfter(Date.today().set({hour: 15, minute: 15})) || (new Date()).getDay() > 5) {
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
	updatePeriodLabel();
}

function updatePeriodLabel() {
	'use strict';
	var name = belltimes.bells[currentBellIndex].bell,
		inLabel = 'starts in';
	name = name.replace('Roll Call', 'School Starts').replace('End of Day', 'School Ends');
	if (/^\d$/.test(name)) { // 'Period x' instead of 'x'
		if (name in window.todayNames.timetable) {
			name = window.todayNames.timetable[name].fullName;
		}
		else {
			name = 'Period ' + name;
		}
	} else if (name == 'Transition') {
		name = 'Period ' + belltimes.bells[currentBellIndex - 1].bell;
		inLabel = 'ends in';
	} else if (name == 'School Starts' || name == 'School Ends') {
		inLabel = 'in';
	}
	$('#period-label').text(name);
	$('#in-label').text(inLabel);
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

document.addEventListener('readystatechange', domReady);
