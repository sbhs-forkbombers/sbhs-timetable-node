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
/* globals getLoggedIn, loadNotices, loadTimetable, todayNames */ /* jshint -W098, -W117 */

/* Variables */
var timetable,
	belltimes,
	year,
	dateOffset = -1,
	needMidnightCountdown = false,
	reloading = false,
	currentBellIndex = -1, // next bell
	nextStart,
	manualOverride = 0, // manual date offset for public holidays etc - increases up to a max of 5 days in the future
	topExpanded = false,
	leftExpanded = false,
	rightExpanded = false,
	bottomExpanded = false,
	miniMode = window.innerWidth < 800,
	bellsCached = false,
	timetableCached = false,
	noticesCached = false,
	rigToFail = true,
	last_screen_tap = Date.now();

function updateSidebarStatus() {
	/* Show load state info for various API data */
	'use strict';
	/* Loading state symbols */
	var tick = '<span class="octicon octicon-check ok"></span>',
		cross = '<span class="octicon octicon-x failed"></span>',
		cached = '<span class="octicon octicon-alert stale"></span>',
		loading = '<span class="idk">…</span>';
	/* Local variables */
	var belltimesOK = window.hasOwnProperty('belltimes'),
		noticesOK = window.notices && window.notices.notices && !window.notices.notices.failure,
		timetableOK = window.hasOwnProperty('todayNames') && todayNames.timetable && !todayNames.timetable.failure,
		belltimesClass = 'ok',
		belltimesText = 'OK',
		timetableClass = 'failed',
		timetableText = 'Failed',
		noticesClass = 'failed',
		noticesText = 'Failed',
		shortText = ['B: '+tick,'T: '+cross,'N: '+cross];

	if (!belltimesOK) {
		belltimesText = 'Failed';
		belltimesClass = 'failed';
		shortText[0] = 'B: ' + cross;
	}

	if (timetableCached) {
		timetableText = 'Cached';
		timetableClass = 'stale';
		shortText[1] = 'T: ' + cached;
	} else if (timetableOK) {
		timetableText = 'OK';
		timetableClass = 'ok';
		shortText[1] = 'T: ' + tick;
	}

	if (noticesCached) {
		noticesText = 'Cached';
		noticesClass = 'stale';
		shortText[2] = 'N: ' + cached;
	} else if (noticesOK) {
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
	/* Collapses a pane */
	'use strict';
	var el = $('#'+p+'-pane');
	var cfg = {};
	cfg[p] = '-110%';
	el.velocity('stop').velocity(cfg, 750, 'ease');
	$('#'+p+'-pane-arrow').removeClass('expanded');
	window[p+'Expanded'] = false;
}

function expandPane(p) {
	/* Expands a pane */
	'use strict';
	var el = $('#'+p+'-pane');
	var cfg = {};
	cfg[p] = 0;
	el.velocity('stop').velocity(cfg, 750, 'ease');
	$('#'+p+'-pane-arrow').addClass('expanded');
	window[p+'Expanded'] = true;
}

function togglePane(which) {
	/* Toggles expand state of a pane */
	'use strict';
	if (window[which+'Expanded']) {
		collapsePane(which);
	} else {
		expandPane(which);
	}
}

function calculateDay() {
	/* Calculate the day that schools starts on. */
	'use strict';
	var date = new Date(),
		dayOffset = 0,
		schoolEnd = new Date();
	schoolEnd.setHours(15, 14, 59);
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
	/* Find the next school day (returns time as midnight) */
	'use strict';
	var res;
	if (dateOffset == -1) {
		calculateDay();
	}
	if (window.todayNames && window.todayNames.date) {
		res = new Date(window.todayNames.date);
		res.setHours(0, 0, 0);
		return res;
	}
	res = new Date();
	res.setDate(res.getDate() + dateOffset + manualOverride + (needMidnightCountdown ? 1 : 0));
	res.setHours(0,0,0);
	return res;
}

function getDateString() {
	'use strict';
	var ds = getNextSchoolDay();
	console.log(ds);
	return ds.getFullYear() + '-' + (ds.getMonth()+1) + '-' + ds.getDate();
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
var endOfDay = false;
function reloadBelltimes() {
	/* Try to reload the belltimes */
	'use strict';
	if (endOfDay) {
		return; // #NOPE
	}
	reloading = true;
	endOfDay = true;
	var s;
	if (window.todayNames && window.todayNames.date) {
		s = window.todayNames.date;
	} else {
		var d = getNextSchoolDay();
		s = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
	}
	console.log('the thing is',s);
	var myXHR = new XMLHttpRequest();
	myXHR.onload = handleBells;
	myXHR.open('get', '/api/belltimes?date=' + s, handleBells);
	myXHR.send();
	//$.getJSON('/api/belltimes?date=' + getNextSchoolDay().toString('yyyy-MM-d'), handleBells);
}
loadTimetable();
reloadBelltimes();

function handleBells(bells) {
	/* Load the belltimes */
	/* jshint validthis: true */
	'use strict';
	window.belltimes = JSON.parse(this.responseText);
	if (belltimes.status === 'Error') {
		endOfDay = false;
		if (window.HOLIDAYS) {
			manualOverride = 6;
			loadComplete();
			return;
		}
		manualOverride++;
		if (manualOverride > 5) {
			document.getElementById('period-label').innerHTML = 'Couldn\'t get belltimes';
			document.getElementById('in-label').innerHTML = 'oops :( maybe if you <a href="/try_do_oauth">login</a> it will work?';
			document.getElementById('countdown-label').style.display = 'none';
			console.error('No bells for more than five days in a row, SBHS might be down!');
			return;
		}
		document.getElementById('period-label').innerHTML = 'One sec…';
		reloadBelltimes();
		return;
	}
	console.log('fantastic!');
	 // now that the belltimes are done, we can load the subject info
	setTimeout(loadNotices, 0);
	endOfDay = false;
	if (document.readyState == 'complete') {
		loadComplete();
	}
}

function toggleExpansion() {
	/* jshint validthis: true */
	'use strict';
	if (!$('#period-label').hasClass('velocity-animating')) {
		if (this.id == 'expand') {
			$('#period-label,#in-label,#feedback,#sidebar,.really-annoying').velocity('stop').velocity('fadeOut', { duration: 400 });
			$('#countdown-label').css({fontSize: '10em', top: '50%', left: 0, width: '100%'}).css({position: 'fixed', marginTop: '-1em'});
			this.style.display = 'none';
			$('#collapse').css({'display': 'block'});
			window.localStorage.expanded = true;
		} else {
			$('#countdown-label').velocity({fontSize: miniMode ? '5em' : '7em', width: 'inherit'}).css({position: 'relative', marginTop: 0})[0].setAttribute('style', '');
			$('#period-label,#in-label,#feedback,#sidebar,.really-annoying').velocity('stop').velocity('fadeIn');
			this.style.display = 'none';
			$('#expand').css({'display': 'block'});
			window.localStorage.expanded = false;
		}
	}
}

function fadeOutUpdate() {
	'use strict';
	$('#update').velocity('fadeOut', { duration: 300 });
}

function loadBackgroundImage() {
	/* jshint -W041 */
	'use strict';
	if ('cached-bg' in window.localStorage) {
		var c = colourscheme.bg.slice(1);
		var r = Number('0x'+c.substr(0,2));
		var g = Number('0x'+c.substr(2,2));
		var b = Number('0x'+c.substr(4,2));
		var rgb = 'rgba(' + r + ',' + g + ',' + b + ', 0.5)';
		$('#background-image').addClass('customBg');
		var style = document.createElement('style');
		style.innerText = '#background-image { background: linear-gradient(' + rgb + ',' + rgb + '), #' + c + ' url(' + window.localStorage['cached-bg'] + ') }';
		style.id = 'i-dont-even';
		document.head.appendChild(style);
	} else {
		$('#background-image').removeClass('customBg');
		var el = document.getElementById('i-dont-even');
		if (el != null) {
			document.head.removeElement(el);
		}
	}
}

function base64Image(url, width, height, callback) {
	'use strict';
	var img = new Image();

	img.onload = function (evt) {
		var canvas = document.createElement('canvas');

		canvas.width  = width;
		canvas.height = height;

		var imgRatio    = img.width / img.height,
		canvasRatio = width / height,
		resultImageH, resultImageW;

		if (imgRatio < canvasRatio) {
			resultImageH = canvas.height;
			resultImageW = resultImageH * imgRatio;
		}
		else {
			resultImageW = canvas.width;
			resultImageH = resultImageW / imgRatio;
		}

		canvas.width  = resultImageW;
		canvas.height = resultImageH;
		canvas.getContext('2d').drawImage(img, 0, 0, resultImageW, resultImageH);
		callback(canvas.toDataURL());
	};

	img.src = url;
}

function handleUpload() {
	'use strict';
	if ('cached-bg' in window.localStorage) {
		delete window.localStorage['cached-bg'];
		loadBackgroundImage();
		$('#custom-background').html('Choose...');
	}
	else {
		var input = $('<input type="file" accept="image/*">');
		input.on('change', function(e) {
			console.log('loading a file!');
			if (input[0].files && input[0].files[0]) {
				var reader = new FileReader();
				reader.onload = function(e) {
					base64Image(e.target.result, 1280, 720, function (b64) {
						localStorage.setItem('cached-bg', b64);
						loadBackgroundImage();
					});
				};
				reader.readAsDataURL(input[0].files[0]);
				$('#custom-background').html('Clear');
			}
		});
		console.log('requesting upload...');
		input.click();
	}
}

function domReady() {
	/* DOM loaded */
	'use strict';
	if (document.readyState != 'complete') {
		return;
	}
	loadBackgroundImage();
	if (!window.HOLIDAYS) {
		setInterval(updateCountdownLabel, 1000);
	} else {
		setInterval(updateCountdownLabel, 12);
	}
	if ((belltimes !== null && belltimes !== undefined) || window.HOLIDAYS) {
		setTimeout(loadComplete, 0);
	}
	if (getLoggedIn()) {
		$('#login-status').html('<a href="/logout" title="Log out" style="text-decoration: none">Log out <span class="octicon octicon-sign-out"/></a>');
	} else {
		$('#login-status').html('<a href="/try_do_oauth" title="Log in" style="text-decoration: none">Log in <span class="octicon octicon-sign-in"/></a>');
	}
	$('#left-pane-arrow').click(function() {
		if (topExpanded) {
			collapsePane('top');
		}
		if ((window.innerWidth <= 450) && (rightExpanded)) {
			collapsePane('right');
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
		if ((window.innerWidth <= 450) && (leftExpanded)) {
			collapsePane('left');
		}
		togglePane('right');
	});

	$('#cached').click(function() {
		if (!$('#verbose-hidden').hasClass('velocity-animating')) {
			if ($('#dropdown-arrow').hasClass('expanded')) {
				$('#verbose-hidden').velocity('stop').velocity('slideUp', { duration: 300 });
				$('#dropdown-arrow').removeClass('expanded');
			} else {
				$('#verbose-hidden').velocity('stop').velocity('slideDown', { duration: 300 });
				$('#dropdown-arrow').addClass('expanded');
			}
		}
	});

	$('#launch-settings').click(function() {
		$('#settings-modal,#fadeout').velocity('stop').velocity('fadeIn');
	});

	$('#close-settings-modal').click(function() {
		$('#settings-modal,#fadeout').velocity('stop').velocity('fadeOut');
	});

	$('#custom-background').click(handleUpload);
	if ('cached-bg' in window.localStorage) {
		$('#custom-background').html('Clear');
	}
	var options = ['default', 'red', 'green', 'purple'];
	$('#colourscheme-combobox')[0].selectedIndex = ((options.indexOf(colour) > -1) ? options.indexOf(colour) : 0);

	$('#colourscheme-combobox').change(function() {
		/*jshint validthis: true */
		var el = this.options[this.selectedIndex].value;
		if (/colour/.test(window.location.search)) {
			window.location.search = window.location.search.replace(/colour=.+?(\&|$)/, 'colour='+el+'&');
		}
		else {
			if (window.location.search.substr(0,1) === '?') {
				window.location.search += '&colour='+el;
			}
			else {
				window.location.search = '?colour='+el;
			}
		}
	});


	if (inverted) {
		$('#invert-enable')[0].checked = true;
	}
	$('#invert-enable').change(function() {
		/*jshint validthis: true */
		if (this.checked) {
			if (window.location.search.substr(0,1) === '?') {
				window.location.search = window.location.search + '&invert=1';
			}
			else {
				window.location.search = '?invert=1';
			}
		}
		else {
			window.location.search = window.location.search.replace(/.invert=.+?\&?/, '');
		}
	});

	$('#left-pane-target').swipeRight(function() {
		if (topExpanded) {
			collapsePane('top');
		}
		if ((window.innerWidth <= 450) && (rightExpanded)) {
			collapsePane('right');
		} else {
			expandPane('left');
		}
	});

	$('#right-pane-target').swipeLeft(function() {
		if (topExpanded) {
			collapsePane('top');
		}
		if ((window.innerWidth <= 450) && (leftExpanded)) {
			collapsePane('left');
		} else {
			expandPane('right');
		}
	});

	$('#top-pane-target').swipeDown(function() {
		if (rightExpanded) {
			collapsePane('right');
		}
		if (leftExpanded) {
			collapsePane('left');
		}
		expandPane('top');
	});

	$('#left-pane').swipeLeft(function() {
		collapsePane('left');
	});

	$('#right-pane').swipeRight(function() {
		collapsePane('right');
	});

	$('#bottom-pane-target').swipeUp(function() {
		collapsePane('top');
	});

	$('#cached').swipeDown(function() {
		$('#verbose-hidden').velocity('stop').velocity('slideDown', { duration: 300 });
		$('#dropdown-arrow').addClass('expanded');
	});

	$('#cached').swipeUp(function() {
		$('#verbose-hidden').velocity('stop').velocity('slideUp', { duration: 300 });
		$('#dropdown-arrow').removeClass('expanded');
	});
	
	$(document).keydown(function(e) {
		if (e.which == 27) { // esc
			$('#settings-modal,#fadeout').velocity('stop').velocity('fadeOut');
		} else if (e.which == 83) { // s
			if ($('#settings-modal').css('display') !== 'block') {
				$('#settings-modal,#fadeout').velocity('stop').velocity('fadeIn');
			} else {
				$('#settings-modal,#fadeout').velocity('stop').velocity('fadeOut');
			}
		/*} else if (e.which == 69 || e.which == 81) { // e/q FIXME: make toggleExpansion not use this and things.
			toggleExpansion();*/
		} else if (e.which == 65 || e.which == 37) { // a/left arrow
			if (topExpanded) {
				collapsePane('top');
			}
			if ((window.innerWidth <= 450) && (rightExpanded)) {
				collapsePane('right');
			}
			togglePane('left');
		} else if (e.which == 87 || e.which == 38) { // w/up arrow
			if (rightExpanded) {
				collapsePane('right');
			}
			if (leftExpanded) {
				collapsePane('left');
			}
			togglePane('top');
		} else if (e.which == 68 || e.which == 39) { // d/right arrow
			if (topExpanded) {
				collapsePane('top');
			}
			if ((window.innerWidth <= 450) && (leftExpanded)) {
				collapsePane('left');
			}
			togglePane('right');
		}
	});

	var event = 'mousemove';
	if (miniMode) {
		event = 'touchstart';
	}
	/*setTimeout(function() {
		$('#cached').detach().appendTo('#top-pane').css({position: 'absolute', right: 20, top: 0});
	}, 10000);*/
	var scrntap_id = 0;
	var scrntap = function() {
		if ((Date.now() - last_screen_tap) > 3000) {
			$('.arrow').css({ opacity: 0 }).css({ visibility: 'hidden' });
			$('body').css({cursor: 'none'});
			$('#update,.really-annoying,#sidebar').velocity('stop').velocity({ 'opacity': 0 }, { duration: 300 });
		} else {
			scrntap_id = setTimeout(scrntap, 3000 - (Date.now() - last_screen_tap));
		}
	};

	var showThings = function() {
		$('.arrow').css({ 'visibility': 'visible', 'opacity': 'inherit' });
		$('body').css({ 'cursor': 'default' });
		$('#update,.really-annoying,#sidebar').velocity('stop').velocity({ 'opacity': 1 }, { duration: 300 });
		last_screen_tap = Date.now();
		if (scrntap_id !== 0) {
			clearTimeout(scrntap_id);
		}
		setTimeout(scrntap, 5000);
	};
	if (window.PointerEvent) {
		document.addEventListener('pointerdown', showThings);
	} else if (window.MSPointerEvent) {
		document.addEventListener('MSPointerDown', showThings);
	}
	document.addEventListener('mousemove', showThings);
	document.addEventListener('onclick', showThings);
	document.addEventListener('touchstart', showThings);
	scrntap_id = setTimeout(scrntap, 5000);

	//setTimeout(fadeOutUpdate, 10000);

	$('#expand,#collapse').on('click', toggleExpansion);

	if (window.localStorage.expanded === 'true') {
		$('#expand').click();
	}

}

function snazzify(el) {
	'use strict';
	var r = Math.floor(Math.random()*255);
	var g = Math.floor(Math.random()*255);
	var b = Math.floor(Math.random()*255);
	$(el).velocity({colorRed: r, colorGreen: g, colorBlue: b});
}

function loadComplete() {
	/* Do when DOM loaded */
	'use strict';
	reloading = false;
	// TODO enable this when the app goes stable.
/*	if (/Android/.test(navigator.userAgent) && !('noprompt' in window.localStorage)) {
		var r = confirm('Hey, look, an Android app (BETA)! Install it now from the Play Store?');
		if (r) {
			window.location='https://play.google.com/store/apps/details?id=com.sbhstimetable.sbhs_timetable_android';
		} else {
			window.localStorage.noprompt = true;
		}
	}
*/
	setTimeout(function() {
		$('#top-update').velocity('fadeOut');
	}, 10000);
	//if (!window.HOLIDAYS) {
		calculateUpcomingLesson();
		updateCountdownLabel();
		handleRightPane();
		//$(document.getElementById('disable-grooviness')).velocity({'font-size': '32px'});
		/*var stopSnazzify = setInterval(function() {
			snazzify(document.getElementById('disable-grooviness'));
		}, 500);
		setTimeout(function() {
			clearInterval(stopSnazzify);
			$(document.getElementById('disable-grooviness')).velocity({'font-size': '20px'});
		}, 500*20);*/
	/*} else {
		console.log('activating swag mode');
		setTimeout(loadTimetable, 0);
		$('#period-label,#countdown-label').css({'display': 'none'});
		$('#in-label').html('<br /><br /><a href="/?noholiday">disable the weirdness</a><br /><br /><br />lol strong gaming');
		setInterval(function() {
			snazzify(document.getElementById('in-label'));
		}, 500);
		$('#sidebar,#expand,#collapse,.arrow').addClass('animated').css({'opacity': 0});
		$('#left-pane-arrow').css({'opacity': ''});
	}*/
	if (window.HOLIDAYS) {
		$('#period-label,#in-label,.arrow,#expand-toggle,#sidebar').css({'display': 'none'});
	}
	updateSidebarStatus();

}

function prettifySecondsLeft(sec) {
	/* Make the time look like time */
	'use strict';
	var secs, mins, hrs, ms;
	ms = sec % 1000;
	sec -= ms;
	sec /= 1000;
	secs = sec % 60;
	sec -= secs;
	sec /= 60;
	mins = sec % 60;
	sec -= mins;
	sec /= 60;
	hrs = sec;
	if (secs < 10) {
		secs = '0' + secs;
	}
	if (ms < 10) {
		ms = '00' + ms;
	} else if (ms < 100) {
		ms = '0' + ms;
	}
	if (mins < 10) {
		mins = '0' + mins;
	}
	if (hrs === 0) {
		hrs = '';
	} else if (hrs < 10) {
		hrs = '0' + hrs;
	}
	return (hrs !== '' ? hrs + 'h ' : '') + mins + 'm ' + secs + 's ' + ms + 'ms';
}

function calculateUpcomingLesson() {
	/* Find the next lesson */
	'use strict';
	reloading = true;
	var i, lastOK = 0, bell, bdate, nextBell, now;
	if (belltimes === null) {
		reloadBelltimes();
		return;
	}
	if (HOLIDAYS) {
		var date = new Date('2015-01-28').set({hour:9,minutes:0});
		belltimes = {
			'bells': [
				{'bell': 'Holidays End','time': '09:00'}
			]
		};
		dateOffset = Math.floor((date - Date.now()) / (1000*60*60*24));
		currentBellIndex = 0;
		now = new Date();
		if (new Date().isAfter(Date.today().set({hour:9,minute:0}))) {
			now = now.set({hours: 0, minutes: 0}).addDays(1);
			needMidnightCountdown = true;
		}
		nextStart = date;
		reloading = false;
		return;

	}
	if ((new Date()).isAfter(Date.today().set({hour: 15, minute: 15})) || getNextSchoolDay().isAfter(Date.today())) {
		now = getNextSchoolDay();
	} else if (new Date().isAfter(Date.today().set({hour: 15, minute: 15})) && getNextSchoolDay().valueOf() == Date.today().valueOf()) {
		// after 3:15!!!!
		calculateDay();
		loadTimetable();
		calculateUpcomingLesson();
		setTimeout(loadNotices, 0);
		return;
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
		console.log('next bell pls');
		calculateDay();
		reloadBelltimes();
	}
	currentBellIndex = Number(lastOK);
	nextStart = nextBell;
	reloading = false;
	setTimeout(updatePeriodLabel, 100); // async
}

function updatePeriodLabel() {
	/* Update the period label */
	'use strict';
	if (window.HOLIDAYS) {
		return; // no override lol strong gaming
	}
	var name = belltimes.bells[currentBellIndex].bell,
		inLabel = 'starts in', pNum, roomChangedInfo, hasCover, hasCasual;
	name = name.replace('Roll Call', 'School Starts').replace('End of Day', 'School Ends');
	if (/^\d$/.test(name)) { // 'Period x' instead of 'x'
		pNum = name;
		if (name in window.todayNames.timetable) {
			name = window.todayNames.timetable[name].fullName;
		} else {
			name = 'Period ' + name;
		}
	} else if (name == 'Transition') {
		pNum = belltimes.bells[currentBellIndex-1].bell;
		if (pNum in window.todayNames.timetable) {
			name = window.todayNames.timetable[pNum].fullName;
		} else {
			name = 'Period ' + belltimes.bells[currentBellIndex - 1].bell;
		}
		inLabel = 'ends in';
	} else if (name == 'School Starts' || name == 'School Ends') {
		inLabel = 'in';
	} else {
		if (/^\d$/.test(belltimes.bells[currentBellIndex-1].bell)) {
			pNum = belltimes.bells[currentBellIndex-1].bell;
			inLabel = 'ends in';
			name = 'Period ' + pNum;
			if (pNum in window.todayNames.timetable) {
				name = window.todayNames.timetable[pNum].fullName;
			}
		}
	}

	roomChangedInfo = '';
	if (pNum && window.todayNames && pNum in window.todayNames.timetable && window.todayNames.timetable[pNum].changed) {
		pNum = window.todayNames.timetable[pNum];
		if ('roomTo' in pNum) {
			if (!miniMode) {
				roomChangedInfo = name + ' is in room ' + pNum.roomTo + ' instead of ' + pNum.roomFrom + '. ';
			} else {
				roomChangedInfo = 'Room: ' + pNum.roomTo + ' ';
			}
		}
		if ('hasCover' in pNum) {
			if (pNum.hasCover && pNum.hasCasual) { // casual teacher
				if (!miniMode) {
					roomChangedInfo += 'You\'ll be having ' + pNum.casualDisplay + ' instead of your usual teacher.';
				} else {
					roomChangedInfo += 'Casual: ' + pNum.casualDisplay;
				}
			} else if (!pNum.hasCover) { // no teacher
				if (!miniMode) {
					roomChangedInfo += 'There\'s no teacher covering this class today (we think).';
				} else {
					roomChangedInfo += 'No teacher (maybe)';
				}
			}
		}
	}
	$('#period-label').text(name);
	$('#in-label').text(inLabel);
	if (belltimes.bellsAltered) {
		if (miniMode) {
			roomChangedInfo = belltimes.bellsAlteredReason + '! ' + roomChangedInfo;
		} else {
			roomChangedInfo = 'Bells changed: ' + belltimes.bellsAlteredReason + ' ' + roomChangedInfo;
		}
	}
	$('#top-line-notice').text(roomChangedInfo);
}

function updateCountdownLabel() {
	/* Update the countdown */
	'use strict';
	if (reloading || !window.belltimes) {
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
	left = nextStart - now; // XXX REMOVE THIS WHEN WE GO BACK
	$('#countdown-label').text(/*prettifySecondsLeft(left)*/left + 'ms');
}

function handleRightPane() {
	/* Fill out the right pane */
	'use strict';
	var bells = belltimes.bells, rowClass, bell, timeClass;
	var res = '<table><tbody>';
	for (var i in bells) {
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

document.addEventListener('readystatechange', domReady);
