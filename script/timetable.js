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
	window.todayNames = res;
	updatePeriodLabel();
	handleLeftPane();
}

function loadTimetable() {
	'use strict';
	if ((belltimes.day+belltimes.weekType) in window.localStorage) {
		window.todayNames = JSON.parse(window.localStorage[belltimes.day+belltimes.weekType]);
	}
	else if (!getLoggedIn()) {
		window.todayNames = {timetable: {}};
		return;
	}
	if (!getLoggedIn()) {
		return;
	}
	var xhr = new XMLHttpRequest();
	xhr.onload = handleTimetable;
	xhr.open('GET', '/api/today.json', true);
	xhr.send();
}

function handleLeftPane() {
	'use strict';
	var pane = $('#left-pane'),
		html = '<table><tbody><tr><td>Subject</td><td>Teacher</td><td>Room</td></tr>',
		timetable = todayNames.timetable,
		prefix, subj, suffix, room, teacher, fullTeacher, subjName,
		roomChanged, teacherChanged, cancelled = false;
	for (var i = 1; i < 6; i++) {
		if (!timetable[i].room) {
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
			if (/\d$/.test(timetable[i].title)) {
				suffix = timetable[i].title.substr(-1);
				subj = subj.slice(0,-1);
			}
			if (subj.length == 3 || (subj.length == 2 && suffix == '')) { // very tentative guess that this is an elective - char 1 should be prefix
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
			html += '<tr'+(cancelled?' class="cancelled"':'')+'><td title="'+subjName+'">'+timetable[i].year+prefix+'<strong>'+subj+'</strong>'+suffix+'</td><td '+(teacherChanged?'class="changed" ':'')+'title="'+fullTeacher+'">'+teacher+'</td><td'+(roomChanged?' class="changed"':'')+'>'+room+'</td></tr>';
			cancelled = false;
			roomChanged = false;
			teacherChanged = false;
		}
	}
	html += '</tbody></table>';
	pane.html(html);

}
