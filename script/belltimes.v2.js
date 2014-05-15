/*
Copyright (C) 2014  James Ye  Simon Shields

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
/*jshint latedef: nofunc */
var timetable,
	belltimes,
	year,
	dateOffset = 0,
	needMidnightCountdown = false,
	recalculating = false,
	currentBellIndex = -1, // next bell
	nextStart;

/** returns midnight ON the next school day */
function getNextSchoolDay() {
	'use strict';
	if (dateOffset == -1) {
		calculateDay();
	}
	return Date.today().add(dateOffset + (needMidnightCountdown ? 1 : 0)).day();
}

/** returns the CURRENT TIME in dateOffset days */
function getDateOffsetDate() {
	'use strict';
	if (dateOffset == -1) {
		calculateDay();
	}
	return (new Date()).add(dateOffset).day();
}

/** calculate the day that school will be starting on */
function calculateDay() {
	'use strict';
	var date = new Date(),
		dayOffset = 0;
	if (date.is().fri() && date.isAfter(Date.today().set({hour: 15, minute: 15}))) {
		dayOffset += 2; // push to sunday at this time.
		needMidnightCountdown = true;
	} else if (date.is().sat()) {
		dayOffset += 1;
		needMidnightCountdown = true;
	} else if (date.is().sun() || date.isAfter(Date.today().set({hour: 15, minute: 15}))) {
		needMidnightCountdown = true;
	}
	date.add(dayOffset).day();
	dateOffset = dayOffset;

}

function reloadBelltimes() {
	'use strict';
	$.getScript('http://student.sbhs.net.au/api/timetable/bells.json?callback=handleBells&date=' + getNextSchoolDay().toString('yyyy-MM-d'));	
}

function handleBells(bells) {
	'use strict';
	belltimes = bells;
	if (document.readyState == 'complete') {
		loadComplete();
	}
}

function domReady() {
	'use strict';
	if (belltimes !== null) {
		loadComplete();
	}
}

function loadComplete() {
	'use strict';
	calculateUpcomingLesson();
	setInterval(null, 1000);
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
	}
	else if (hrs.length == 1) {
		hrs = '0' + hrs;
	}
	return (hrs !== '' ? hrs + 'h ' : '') + mins + 'm ' + secs + 's';
}
	

function calculateUpcomingLesson() {
	'use strict';
	var i, lastOK, bell, bdate,
		nextBell, now;
	if (belltimes == null) {
		reloadBelltimes();
	}
	if ((new Date()).isAfter(Date.today().set({hour: 15, minute: 15}))) {
		now = getNextSchoolDay();
	}
	else {
		now = new Date();
	}
	for (i in belltimes.bells) {
		bell = belltimes.bells[i].time.split(':');
		bdate = now.clone().set({hour: Number(bell[0]), minute: Number(bell[1])});
		if ((nextBell === undefined || nextBell.isAfter(bdate)) && bdate.isAfter(now)) {
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
}

function updateCountdownLabel() {
	if (nextStart == null) {
		calculateUpcomingLesson();
		return;
	}
	var now = new Date(),
		left = now - nextStart;
	if (left < 0) {
		calculateUpcomingLesson();
	}
	left = now - nextStart;
	$('#countdown-label').text(prettifySecondsLeft(Math.floor(left/1000)));
}

