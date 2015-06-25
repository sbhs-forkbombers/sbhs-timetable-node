/* global moment */
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

var miniMode = window.innerWidth < 800;
var belltimes = undefined;
var timeSpentWaiting = moment();
var cachedCountdownEvent;
var countdownLabel = 'Loading...';
var inLabel = '';
var forcedDayOffset = 0; // brute-forcing public holidays and whatnot
var sbhsFailed = false;
var countdownToTheEnd = true; // only in pre-holiday mode
var _ctteCache = true; // internal use only

function getNextSchoolDay() {
	if (window.today) {
		var m = moment(window.today.date, "YYYY-MM-DD");
		if (m.hours(15).minutes(15).isAfter(moment())) {
			return m.startOf('day');
		} 
	}
	var today = moment();
	var dow = today.days();
	var offset = forcedDayOffset;
	if (dow == 0) { // SUNDAY
		offset++;
	} else if (dow == 6) { // SATURDAY
		offset += 2;
	} else if (today.isAfter(moment().hours(15).minutes(15), 'minute')) {
		offset++;
		if (dow == 5) { // FRIDAY
			offset += 2;
		}
	}
	return today.add(offset, 'days').startOf('day');
}

function sbhsDown() {
	console.log('looks like SBHS is down.');
	$('#countdown-label').html('<img src="/api/picture.jpeg" id="real-cute"/>');
	$('#period-label').text('SBHS is taking too long!');
	$('#in-label').html('here, have a cute picture instead. <a href="javascript:void(0)" onclick="window.location = window.location">reload</a> at any time to try again. <a href="/static/sbhs-failure.html">why does this happen?</a>')
}

function getNextCountdownEvent() {
	if (!window.belltimes || !window.belltimes.status == 200) {
		if (timeSpentWaiting.diff(moment(), 'seconds') < -20 && !sbhsFailed) {
			sbhsFailed = true;
			setTimeout(sbhsDown,1000);
		}
		return timeSpentWaiting; // count up from page load time
	} else {
		if (cachedCountdownEvent && cachedCountdownEvent.isAfter(moment()) && _ctteCache == countdownToTheEnd) {
			return cachedCountdownEvent;
		}
		_ctteCache = countdownToTheEnd;
		var termEnd = moment(config.nextHolidayEvent.moment);
		if (countdownToTheEnd && moment().add(1, 'd').isAfter(termEnd) && moment().isBefore(termEnd)) {
			countdownLabel = 'School ends';
			inLabel = '<sup><em>finally</em></sup>in';
			$('#in-label,#countdown-label,#period-label').addClass('toggleable');
			hookToggleable();
			cachedCountdownEvent = termEnd;
			return termEnd;
		}
		if (moment().isAfter(termEnd)) {
			window.location = window.location; // reload
		}
		var i = 0;
		var now = moment();
		var nextSchoolDay = getNextSchoolDay();
		for (i = window.startIndex || 0; i < belltimes.bells.length; i++) { // loop over bells to find the next one
			var bell = belltimes.bells[i];
			var hm = bell.time.split(':');
			if (nextSchoolDay.hours(Number(hm[0])).minutes(Number(hm[1])).isAfter(now)) {
				inLabel = 'starts in';
				countdownLabel = bell.bell.replace('Roll Call', 'School Starts').replace('End of Day', 'School Ends');
				if (countdownLabel.indexOf('School') != -1) {
					inLabel = 'in';
				}
				if (window.today && /^\d/.test(bell.bell) && window.today.timetable) {
					// period - populate data from timetable
					if (bell.bell in today.timetable) {
						countdownLabel = today.timetable[bell.bell].fullName;
					} else {
						countdownLabel = 'Free';
					}
				} else if (/^\d/.test(bell.bell)) {
					countdownLabel = 'Period ' + bell.bell;
				}
				if (countdownLabel == 'Transition' || countdownLabel == 'Recess' || countdownLabel == 'Lunch 1') {
					inLabel = 'ends in';
					var next = belltimes.bells[i-1];
					if (window.today && window.today.timetable && /^\d/.test(next.bell)) {
						if (next.bell in today.timetable) {
							countdownLabel = today.timetable[next.bell].fullName;
						} else {
							countdownLabel = 'Free';
						}
					} else if (/^\d/.test(next.bell)) {
						countdownLabel = 'Period ' + next.bell;
					} else {
						countdownLabel = next.bell;
					}
				}
				/*if (countdownLabel.startsWith('Transition') || countdownLabel === 'Lunch 2' || countdownLabel.startsWith('Recess')) {
					inLabel = 'starts in';
					var next = belltimes.bells[i+1];
					if (window.today && /^\d/.test(next.bell)) {
						if (next.bell in today.timetable) {
							countdownLabel = today.timetable[next.bell].fullName;
						} else {
							countdownLabel = 'Free';
						}
					} else if (/^\d/.test(next.bell)) {
						countdownLabel = 'Period ' + next.bell;
					} else {
						countdownLabel = next.bell;
					}
				}*/
				cachedCountdownEvent = nextSchoolDay;
				return nextSchoolDay;
			}
		}
		return now;
	}
}


EventBus.on('bells', function(ev, bells) {
	window.belltimes = bells;
	if (window.belltimes.status == "Error") {
		if (window.today) {
			reloadBells();
			loadNotices();
			loadBarcodeNews();
		} else {
			forcedDayOffset++;
			if (forcedDayOffset > 10) {
				// cry
				sbhsDown();
			} else {
				reloadBells();
				loadNotices();
				loadBarcodeNews();
			}
		}
	}
	if (belltimes.bellsAltered) $('#top-line-notice').text('Bells changed: ' + belltimes.bellsAlteredReason);
	else $('#top-line-notice').text('');
});

function updateCountdown() {
	if (config.HOLIDAYS || sbhsFailed) return;
	$('#countdown-label').text(getNextCountdownEvent().fromNowCountdown());///*Math.abs(getNextCountdownEvent().diff(moment(), 'seconds')) + 's'*/);
	$('#in-label').html(inLabel);
	$('#period-label').text(countdownLabel);

}

function reloadBells() {
	$.getJSON('/api/belltimes?date=' + getNextSchoolDay().format('YYYY-MM-DD'), function(data) {
		EventBus.post('bells', data);
	});
}

function domReady() {
	if (document.readyState !== 'complete') return;
	if (!window.moment || !window.$ || !$.Velocity) {
		console.warn('MISSING SOME THINGS!');
		console.warn('this would go badly. so we won\'t let it go at all (▀̿Ĺ̯▀̿ ̿)');
		document.getElementById('period-label').innerHTML = 'Oops';
		document.getElementById('in-label').innerHTML = 'We couldn\'t load some things we need to run. Maybe <a href="/">try again?</a><br />or look at this picture!';
		document.getElementById('countdown-label').innerHTML = '<img src="/api/picture.jpeg"></img>';
		return;
	}
	window.belltimes = window.config.bells;
	$('#top-line-notice').text(belltimes.bellsAlteredReason);
	updateCountdown();
	reloadBells();
	// holidays
	if (config.HOLIDAYS) {
		$('#period-label,#countdown-label,.arrow,.sidebar').css({display: 'none'});
		$('#yt').css({display: 'block'}).html('<iframe src="https://www.youtube.com/embed/' + config.holidayCfg.video + '?autoplay=1&loop=1" frameborder="0" allowfullscreen></iframe>');
		$('#in-label').html(config.holidayCfg.text);
		$('body').css({'background': config.holidayCfg.background});
	} else {
		loadBackgroundImage();
		if (window.config.loggedIn) {
			$('#login-status').html('<a href="/logout" title="Log out" style="text-decoration: none">Log out <span class="octicon octicon-sign-out"/></a>');
		} else {
			$('#login-status').html('<a href="/try_do_oauth" title="Log in" style="text-decoration: none">Log in <span class="octicon octicon-sign-in"/></a>');
		}
		setInterval(updateCountdown, 1000);
	}
	attachAllTheThings();
	EventBus.post('pageload', {});
}

document.addEventListener('readystatechange', domReady);
