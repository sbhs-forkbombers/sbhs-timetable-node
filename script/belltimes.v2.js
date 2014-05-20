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
	date.add(dayOffset).day();
	dateOffset = dayOffset;
}

function reloadBelltimes() {
	'use strict';
	reloading = true;
	$.getJSON('/api/belltimes?date=' + getNextSchoolDay().toString('yyyy-MM-d'), handleBells);
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
	if (document.readyState != 'complete') {
		return;
	}
	if (belltimes !== null && belltimes !== undefined) {
		loadComplete();
	} else {
		reloadBelltimes();
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
	var i, lastOK, bell, bdate,
		nextBell, now;
	if (belltimes === null) {
		reloadBelltimes();
		reloading = false;
		return;
	}
	if ((new Date()).isAfter(Date.today().set({hour: 15, minute: 15})) ) { //|| (new Date()).getDay() > 5) { //FIXME: Uncomment previous code to count properly on weekend. Comment to test weekdays on weekends.
		now = getNextSchoolDay();
	} else {
		now = new Date();
	}
	for (i in belltimes.bells) {
		bell = belltimes.bells[i].time.split(':');
		bdate = now.clone().set({hour: Number(bell[0]), minute: Number(bell[1]), second: 0});
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
	reloading = false;
	updatePeriodLabel();
}

function updatePeriodLabel() {
	'use strict';
	var name = belltimes.bells[currentBellIndex].bell,
		inLabel = 'starts in';
	name = name.replace('Roll Call', 'School Starts').replace('End of Day', 'School Ends');
	if (/^\d$/.test(name)) { // 'Period x' instead of 'x'
		name = 'Period ' + name;
	} else if (name == 'Transition') {
		name = 'Period ' + belltimes.bells[currentBellIndex - 1].bell;
		inLabel = 'ends in';
	} else if (name == 'School Starts' || name == 'School Ends') {
		inLabel = 'in';
	}
	console.log(name);
	console.log(inLabel);
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
