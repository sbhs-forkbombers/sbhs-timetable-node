function handleLeftPane() {
	'use strict';
	var pane = $('#left-pane'),
		html = '<table><tbody><tr><td>Subject</td><td>Teacher</td><td>Room</td></tr>',
		timetable = todayNames.timetable,
		prefix, subj, suffix, room, teacher, fullTeacher, subjName, final,
		roomChanged, teacherChanged, cancelled = false;
	for (var i = 1; i < 6; i++) {
		if (!(i in timetable) || !timetable[i].room) {
			html += '<tr><td>Free period</td><td></td><td></td></tr>';
		}
		else {
			prefix = '';
			subj = '';
			suffix = '';
			subj = timetable[i].title;
			room = timetable[i].room;
			teacher = timetable[i].teacher;
			fullTeacher = timetable[i].fullTeacher;
			subjName = timetable[i].fullName;
			final = timetable.variationsFinalised;
			if (/\d$/.test(timetable[i].title) || /[a-z][A-Z]$/.test(timetable[i].title)) {
				suffix = timetable[i].title.substr(-1);
				subj = subj.slice(0,-1);
			}
			if (subj.length == 3 || (subj.length == 2 && suffix === '')) { // very tentative guess that this is an elective - char 1 should be prefix
				prefix = subj[0];
				subj = subj.substr(1);
			}
			if (timetable[i].changed) {
				if (timetable[i].hasOwnProperty('hasCover')) {
					if (!timetable[i].hasCover) {
						cancelled = true;
					}
					else if (timetable[i].hasCasual) {
						teacherChanged = true;
						teacher = timetable[i].casual.toUpperCase();
						fullTeacher = timetable[i].casualDisplay;
					}
				}
				if (timetable[i].roomFrom) {
					roomChanged = true;
					room = timetable[i].roomTo;
				}
			}

			html += '<tr'+(cancelled?' class="cancelled"':'')+'><td title="'+subjName+'">'+timetable[i].year+prefix+'<strong>'+subj+'</strong>'+suffix+'</td><td '+(teacherChanged?'class="changed'+(!final?' changeable" ':'" '):'')+'title="'+fullTeacher+'">'+teacher+'</td><td'+(roomChanged?' class="changed' + (!final?' changeable"':'"'):'')+'>'+room+'</td></tr>';
			cancelled = false;
			roomChanged = false;
			teacherChanged = false;
		}
	}
	html += '</tbody></table><div class="changeable-status">';
	if (todayNames.variationsFinalised) {
		html += 'This info is \'fixed\'</div>';
	}
	else {
		html += 'This info may change</div>';
	}
	pane.html(html);

}

function getLoggedIn() {
	'use strict';
	return window.loggedIn;
}

function handleTimetable(e) {
	'use strict';
	/* jshint validthis: true */
	var lsKey = belltimes.day + belltimes.weekType;
	var res = JSON.parse(this.response);
	if (res.timetable && !res.hasVariations) {
		window.localStorage[lsKey] = this.response;
	}
	else if (!res.timetable) {
		$('#rtd-unavailable').html('Real-time data inaccessible');
		return; // we don't want to do that... TODO refresh access token and stuff
	}
	window.todayNames = res;
	$('#rtd-unavailable').html('Loaded real-time data!');
	setTimeout(function() {
		$('#rtd-unavailable').fadeOut();
		setTimeout(function() { $('#rtd-unavailable').html('').css({'display': 'block'}); }, 1000);
	}, 3000);
	updatePeriodLabel();
	handleLeftPane();
}

function loadTimetable() {
	'use strict';
	console.log(belltimes.day+belltimes.weekType);
	if ((belltimes.day+belltimes.weekType) in window.localStorage) {
		console.log('loading from localStorage');
		window.todayNames = JSON.parse(window.localStorage[belltimes.day+belltimes.weekType]);
		setTimeout(handleLeftPane, 0);
		$('#rtd-unavailable').html('Loading real-time data...');
	}
	else if (!getLoggedIn() && !window.todayNames) {
		console.log('umm');
		window.todayNames = {timetable: {failure: true}};
	}
	if (!getLoggedIn()) {
		$('#rtd-unavailable').html('<a href="/try_do_oauth">Login</a> to use real-time data');
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.onload = handleTimetable;
	xhr.open('GET', '/api/today.json', true);
	xhr.send();
}

