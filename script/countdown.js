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
var countdownLabel;
var inLabel = 'happens';

function getNextSchoolDay() {
	if (window.today) {
		var m = moment(window.today.date, "YYYY-MM-DD");
		if (m.hours(15).minutes(15).isAfter(moment())) {
			return m.startOf('day');
		} 
	}
	var today = moment();
	var dow = today.days();
	var offset = 0;
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

function getNextCountdownEvent() {
	if (!window.belltimes || !window.belltimes.status == 200) {
		return timeSpentWaiting; // count up from page load time
	} else {
		if (cachedCountdownEvent && cachedCountdownEvent.isAfter(moment())) {
			return cachedCountdownEvent;
		}
		var i = 0;
		var now = moment();
		var cmpMoment = getNextSchoolDay();
		for (i = window.startIndex || 0; i < belltimes.bells.length; i++) { // loop over bells to find the next one
			var bell = belltimes.bells[i];
			var hm = bell.time.split(':');
			if (cmpMoment.hours(Number(hm[0])).minutes(Number(hm[1])).isAfter(now)) {
				inLabel = 'starts in';
				countdownLabel = bell.bell.replace('Roll Call', 'School Starts').replace('End of Day', 'School Ends');
				if (countdownLabel.indexOf('School') != -1) {
					inLabel = 'in';
				}
				if (window.today && /^\d/.test(bell.bell)) {
					// period - populate data from timetable
					if (bell.bell in today.timetable) {
						countdownLabel = today.timetable[bell.bell].fullName;
					} else {
						countdownLabel = 'Free';
					}
				} else if (/^\d/.test(bell.bell)) {
					countdownLabel = 'Period ' + bell.bell;
				}
				if (countdownLabel == 'Transition' || countdownLabel == 'Recess') {
					inLabel = 'ends in';
					var next = belltimes.bells[i-1];
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
				cachedCountdownEvent = cmpMoment;
				return cmpMoment;
			}
		}
		return now;
	}
}


EventBus.on('bells', function(ev, bells) {
	window.belltimes = bells;
});

function updateCountdown() {
	if (config.HOLIDAYS) return;
	$('#countdown-label').text(getNextCountdownEvent().fromNowCountdown());///*Math.abs(getNextCountdownEvent().diff(moment(), 'seconds')) + 's'*/);
	$('#in-label').text(inLabel);
	$('#period-label').text(countdownLabel);

}

function reloadBells() {
	$.getJSON('/api/belltimes?date=' + getNextSchoolDay().format('YYYY-MM-DD'), function(data) {
		EventBus.post('bells', data);
	});
}

document.addEventListener('readystatechange', function domReady() {
	if (document.readyState !== 'complete') return;

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
})