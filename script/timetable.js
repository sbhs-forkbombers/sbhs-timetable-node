function getLoggedIn() {
	'use strict';
	return window.loggedIn;
}

function handleTimetable(e) {
	'use strict';
	/* jshint validthis: true */
	var lsKey = belltimes.day + belltimes.weekType;
	if (e.timetable && !e.hasVariations) {
		window.localStorage[lsKey] = this.response;
	}
	window.todayNames = JSON.parse(this.response);
	updatePeriodLabel();
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
