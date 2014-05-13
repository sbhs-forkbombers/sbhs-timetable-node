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
// TODO clean up quotes.
window.timetable = null;
window.defaultBells = [];
window.defaultBells[0] = {"status":"OK","bellsAltered":false,"bellsAlteredReason":"","bells":[{"bell":"Roll Call","time":"09:00"},{"bell":"1","time":"09:05"},{"bell":"Transition","time":"10:05"},{"bell":"2","time":"10:10"},{"bell":"Lunch 1","time":"11:10"},{"bell":"Lunch 2","time":"11:30"},{"bell":"3","time":"11:50"},{"bell":"Transition","time":"12:50"},{"bell":"4","time":"12:55"},{"bell":"Recess","time":"13:55"},{"bell":"5","time":"14:15"},{"bell":"End of Day","time":"15:15"}],"day":"","term":"Unknown","week":"Unknown","weekType":"fill me in"}; // sun
window.defaultBells[1] = window.defaultBells[0]; // mon
window.defaultBells[2] = window.defaultBells[0]; // tue
window.defaultBells[3] = {"status":"OK","bellsAltered":false,"bellsAlteredReason":"","bells":[{"bell":"Roll Call","time":"09:00"},{"bell":"1","time":"09:05"},{"bell":"Transition","time":"10:05"},{"bell":"2","time":"10:10"},{"bell":"Recess","time":"11:10"},{"bell":"3","time":"11:30"},{"bell":"Lunch 1","time":"12:30"},{"bell":"Lunch 2","time":"12:50"},{"bell":"4","time":"13:10"},{"bell":"Transition","time":"14:10"},{"bell":"5","time":"14:15"},{"bell":"End of Day","time":"15:15"}],"day":"","term":"Unknown","week":"Unknown","weekType":"fill me in"}; // wed
window.defaultBells[4] = window.defaultBells[3]; // thu
window.defaultBells[5] = {"status":"OK","bellsAltered":false,"bellsAlteredReason":"","bells":[{"bell":"Roll Call","time":"09:25"},{"bell":"1","time":"09:30"},{"bell":"Transition","time":"10:25"},{"bell":"2","time":"10:30"},{"bell":"Lunch 1","time":"11:25"},{"bell":"Lunch 2","time":"11:45"},{"bell":"3","time":"12:05"},{"bell":"Transition","time":"13:00"},{"bell":"4","time":"13:05"},{"bell":"Recess","time":"14:00"},{"bell":"5","time":"14:20"},{"bell":"End of Day","time":"15:15"}],"day":"","term":"Unkown","week":"Unknown","weekType":"fill me in"}; // fri
window.defaultBells[6] = window.defaultBells[0]; // sat

function is_after_school(hour,min) {
	"use strict";
	if (hour == 15 && min >= 15) {
		return true;
	}
	else if (hour > 15) {
		return true;
	}
	else {
		return false;
	}
}

function redoDate() {
	"use strict";
	dateOffset = 0;
	localtime = new Date();
	now = Math.floor(localtime.getTime() / 1000);
	hour = localtime.getHours(); //$localtime["tm_hour"];
	min  = localtime.getMinutes();
	wday = localtime.getDay();//$localtime["tm_wday"];
	window.afterSchool = false;
	window.day_offset = 0;
	if (is_after_school(hour,min) && wday >= 1 && wday <= 5) { // after school on a weekday
		dateOffset+=1;
		wday = wday%7;
		if (wday == 5) { // it's friday
			dateOffset += 2;
			window.day_offset += 2;
		}
		window.afterSchool = true;

	}
	else {
		window.afterSchool = false;
	}
	if (wday === 0 || wday === 6) { // it's a weekend
		window.weekend = true;
		rWday = wday;
		if (wday==6) { // sat
			dateOffset += 2;
		}
		else { // sun
			dateOffset += 1;
		}
		if (dateOffset == -1) {
			dateOffset = 2;
		}
		window.day_offset += dateOffset;
	}
	else {
		window.weekend = false;
	}
	now += (24*60*60)*(dateOffset-1);
	if (afterSchool) {
		now -= 24*60*60;
	}
	window.now = now;
	window.NOW = new Date(now*1000);
}

redoDate();
belltimes = {"status": "error"};
if (window.localStorage.timetable) {
	window.timetable = JSON.parse(window.localStorage.timetable);
	window.loggedIn = true;
	window.studentYear = window.localStorage.year;
}

$.getJSON("/api/v1/timetable/get", "", function(data, textStatus, jqXHR) {
	"use strict";
	window.tData = data;
	if (data.hasOwnProperty("error")) {
		if (window.localStorage.timetable) return;
		window.timetable = null;
		window.loggedIn = false;
		window.studentYear = "";
	}
	if (window.timetable != data.timetable) {
		window.localStorage.timetable = JSON.stringify(data.timetable);
		window.localStorage.studentYear = data.year;
	}
	window.timetable = data.timetable;
	window.loggedIn = true;
	window.studentYear = Number(data.year);
});

Date.prototype.getYearDay = function() {
	"use strict";
	var onejan = new Date(this.getFullYear(),0,1);
	return Math.ceil((this - onejan) / 86400000);
};

Date.prototype.getDateStr = function() {"use strict";  return this.getFullYear() + "-" + (this.getMonth()+1) + "-" + this.getDate(); };
Date.lastWeekday = function() {
	"use strict";
	var t = new Date();
	if (!t.is().sun() && !t.is().sat()) {
		return new Date();
	}
	else {
		return new Date.last().friday();
	}
};
week = null; 
dow = null;
recalculating = false;
nextBell = null;
nextBellIdx = null;
nextPeriod = null;
startDate = new Date();
afterSchool = false;
/**
 * calculate the next bell
 **/
function recalculateNextBell() {
	"use strict";
	recalculating = true;
	var now = new Date();
	var pName, j;
	if (now.getDateStr() != startDate.getDateStr()) {
		// we've changed days
		startDate = now;
		afterSchool = false;
		day_offset--;
		if (day_offset <= 0) { weekend = false; }
	}
	now.setMinutes(now.getMinutes() + 1);
	var hour = now.getHours();
	var min  = now.getMinutes();
	if ((nextBell !== null && nextBell.bell == "End of Day") || (new Date()).isAfter((new Date()).set({hours: 15, minutes: 15}))) {
		// it's now after school.
		afterSchool = true;
		// should get the next set of bells here
		NOW.setDate(NOW.getDate()+1);
		if (NOW.getDay() == 6) {
			NOW.setDate(now.getDate() + 2);
		}
		else if (NOW.getDay() === 0) {
			NOW.setDate(now.getDate() + 1);
		}
		if (now.getDay() >= 5) {
			// weekend!
			weekend = true;
		}
		dow = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][NOW.getDay()];
		$('#period-name').text("Updating bells...");
		$('#countdown').text('');
		// this will call all the initialise stuff again!
		$.getScript("http://student.sbhs.net.au/api/timetable/bells.json?date=" + NOW.getDateStr() + "&callback=loadTimetable");
	}

	if (afterSchool || weekend) { // the next bell is going to be start of school tomorrow.
		nextBell = belltimes.bells[0];
		nextBell.internal = [9,0];
		nextPeriod = belltimes.bells[1];
		nextPeriod.internal = [9,5];
		pName = nextBell.bell.replace("Roll Call", "School starts").replace("End of Day", "School ends");
		document.getElementById("period-name").innerHTML = pName;
		recalculating = false;
		day_offset = 0;
		var d = new Date();
		if (weekend || d.getDay() == 5) {
			afterSchool = true;
			if (d.getDay() == 5) {
				day_offset += 2;
			}
			else if (d.getDay() == 6) {
				day_offset += 1;
			}
		}
		doReposition();
		return;
	}

	var nearestBellIdx = null;
	var nearestBell = null;

	for (var i = 0; i < belltimes.bells.length; i++) {
		var start = belltimes.bells[i].time.split(":");
		start[0] = Number(start[0]);
		start[1] = Number(start[1]);
		if (start[0] == hour && start[1] >= min) { // after now?
			if (nearestBell === null || ((nearestBell[0] == start[0] && nearestBell[1] > start[1]) || (nearestBell[0] > start[0]))) { // and closer than any other thing we've found so far
				nearestBell = start;
				nearestBellIdx = i;
			}
		}
		else if (start[0] > hour) { // see above (TODO: move this into the one block)
			if (nearestBell === null || ((nearestBell[0] == start[0] && nearestBell[1] > start[1]) || (nearestBell[0] > start[0]))) {
				nearestBell = start;
				nearestBellIdx = i;
			}
		}
		if (nearestBell !== null && ((nearestBell[0] == start[0] && nearestBell[1] < start[1]) || nearestBell[0] < start[0]) && ((nearestBell[0] == hour && nearestBell[1] > min) || nearestBell[0] > hour)) { 
			// we're done!
			break;
		}
	}
	nextBell = belltimes.bells[nearestBellIdx];
	nextBellIdx = nearestBellIdx;
	pName = nextBell.bell.replace("Roll Call", "School starts").replace("End of Day", "School ends");
	if (/Transition|Lunch 1|Recess/i.test(pName)) { // count down until the end of this period rather than the start of whatever's next
		var last = belltimes.bells[nearestBellIdx-1].bell;
		if (window.timetable !== null) {
			//var lesson = last; XXX: maybe unused
			var details = timetable[week.toLowerCase()][dow.substr(0,3).toLowerCase()][Number(last)-1];
			var name = details.name;
			if (name === "") {
				pName = "Free Period";
			}
			else {
				pName = name + " ends";
			}
		}
		else {
			pName = last + " ends";
		}
	}
	if (!/ (starts)| (ends)$/.test(pName)) {
		pName += " starts";
	}
	if (/^\d/.test(pName)) { // make periods look better - "1 ends in" vs "Period 1 ends in"
		pName = "Period " + pName;
	}
	nextBell.internal = nearestBell;
	if (/^\d/.test(nextBell.bell) ) { // work out what the next period is
		nextPeriod = nextBell;
	} 
	else if (nextBell.bell == "End of Day") {
		nextPeriod = null; // period one tomorrow. 
	}
	else {
		j = "";
		var idx = nearestBellIdx;
		while (!/^\d/.test(j)) {
			idx++;
			j = belltimes.bells[idx].bell;
		}
		nextPeriod = belltimes.bells[idx];
		var times = nextPeriod.time.split(":");
		times[0] = Number(times[0]);
		times[1] = Number(times[1]);
		nextPeriod.internal = times;

	}

	document.getElementById("period-name").innerHTML = pName;
	if (timetable !== null && nextPeriod !== null) {
		doNextPeriod(nextPeriod);
	}
	else {
		j = document.getElementById("next-info");
		if (j !== null) {
			j.innerHTML = "";
		}
	}
	recalculating = false;
	doReposition();	
}
/**
 * format what next period is actually going to be
 */
function doNextPeriod(nextP) {
	"use strict";
	var text = "";
	var nextPeriod = timetable[week.toLowerCase()][dow.substr(0,3).toLowerCase()][Number(nextP.bell-1)];
	if (nextPeriod === null) {
		text = "No more periods today!";
	}
	else {
		text = "<strong>Next Period:</strong>";
		if (nextPeriod.name === "") {
			text += " <span class='next-period'>Free Period!";
		}
		else {
			if (nextPeriod.room === "") {
				text += " <span class='next-period'>" + nextPeriod.name + "</span>";
			}
			else {
				text += " <span class='next-period'>" + nextPeriod.name + " in " + nextPeriod.room + "</span>";
			}
		}
	}
	document.getElementById("next-info").innerHTML = text;
}

/**
 * format a given number of seconds into a countdown format
 */
function format(seconds) { 
	"use strict";
	var sec = (seconds % 60) + ""; seconds = Math.floor(seconds/60);
	var min = (seconds % 60); 
	var hrs;
	if (min + (seconds-min) < 100) {
		min += (seconds-min);
		hrs = 0;
	}
	else {
		seconds = Math.floor(seconds/60);
		min += "";
		if (min.length < 2) {
			min = "0" + min;
		}
		hrs = seconds;
	}

	if (sec.length < 2) {
		sec = "0" + sec;
	}
	return (hrs > 0 ? (hrs + "h ") : "") + min + "m " + sec + "s";
}
/**
 * is it hour, min after school?
 */
function isAfterSchool(hour, min) {
	"use strict";
	if (hour == 15 && min >= 15) {
		return true;
	}
	else if (hour > 15) {
		return true;
	}
	return false;
}
/** update the countdown */
function updateTimeLeft() {
	"use strict";
	if (recalculating) { // if we're working out the next bell, stop now (otherwise max stack size exceeded errors happen)
		return;
	}
	var n = new Date();
	//var teststr = n.getDateStr(); XXX: maybe unused
	var el = document.getElementById("countdown");
	var start = nextBell.internal;
	var now;
	if (weekend || afterSchool) { // we need to countdown from midnight on the day in question.
		now = new Date();
		now.setDate(now.getDate()+1+day_offset); // js automatically wraps dates!
		now.setHours(0,0,0);
	}
	else {
		now = new Date();
	}
	// how long?
	var hour = now.getHours();
	var min = now.getMinutes() + hour*60;
	var startMin = start[0]*60 + start[1];
	min = startMin - min;
	var sec = min * 60;
	if (weekend || afterSchool) {
		sec += Math.floor((now.valueOf() - Date.now())/1000); // work out how long there is until midnight
	}
	sec += (60 - now.getSeconds());
	if (sec < 60 || n.getDateStr() != startDate.getDateStr()) {
		recalculateNextBell();
		updateTimeLeft();
		return;
	}	
	el.innerHTML = format(sec-60);
}

var rightEx = false;
var leftEx = false;
var topEx = false;
var botEx = false;

var diaryLoaded = false;
var noticesLoaded = false;
function reloadNotices() {
	"use strict";
	noticesLoaded = false;
	slideOutTop(true);
}
/** slides out/in the top (notices) pane */
function slideOutTop(reload) {
	"use strict";
	if (rightEx) slideOutRight();
	if (leftEx) slideOutLeft();
	if (botEx) slideOutBottom();
	var opts = { // spinner settings
		lines: 10,
		length: 40,
		width: 10,
		radius: 30,
		corners: 1,
		direction: 1,
		color: '#fff',
		speed: 1,
		trail: 60,
		shadow: true,
	};
	if (!noticesLoaded) {
		var target = document.getElementById("slideout-top");
		window.currentNoticesSpinner = new Spinner(opts).spin(target);
	}
	if (reload !== true) {
		$('#slideout-bottom-arrow').toggleClass("mini");
		$('#slideout-top,#slideout-top-arrow').toggleClass("expanded");
		topEx = !topEx;
	}
	if (!noticesLoaded) {
		getNotices();
	}
	noticesLoaded = true;
}
function reloadDiary() {
	"use strict";
	diaryLoaded = false;
	slideOutBottom(true);
}
/** slide out the bottom (diary) pane */
function slideOutBottom(reload) {
	"use strict";
	if (rightEx) slideOutRight();
	if (leftEx) slideOutLeft();
	if (topEx) slideOutTop();
	if (!loggedIn) {
		if (!diaryLoaded) {
			var res = "<div style='text-align:center'><h1>My homework</h1>";
			res += "Record your homework with the click of a button. Sign in with your Google account.<br />";
			res += "You can also sign in using your school email address:<br />";
			res += "<strong>&lt;YourStudentID&gt;@student.sbhs.nsw.edu.au</strong><br /><br />";
			res += '<a href="/login.php?urlback=/timetable.php&new-timetable" class="fake-button">Sign In</a></div>';
			$('#slideout-bottom').html(res);
		}
		$('#slideout-bottom,#slideout-bottom-arrow').toggleClass("expanded");
		botEx = !botEx;
		return;
	}
	var opts = { // spinner settings
		lines: 10,
		length: 40,
		width: 10,
		radius: 30,
		corners: 1,
		direction: 1,
		color: '#fff',
		speed: 1,
		trail: 60,
		shadow: true,
	};
	if (!diaryLoaded) {
		var target= document.getElementById("slideout-bottom");
		window.currentDiarySpinner = new Spinner(opts).spin(target);
	}
	if (reload !== true) {
		$('#slideout-top-arrow').toggleClass("mini");
		$('#slideout-bottom,#slideout-bottom-arrow').toggleClass("expanded");
		botEx = !botEx;
	}
	if (!diaryLoaded) {
		getDiary();
	}
	diaryLoaded = true;
}
/** slide out the right (belltimes) pane */
function slideOutRight() {
	"use strict";
	if (window.oneSlider && leftEx) {
		slideOutLeft();
	}
	if (topEx) {
		slideOutTop();
	}
	if (botEx) {
		slideOutBottom();
	}
	rightEx = !rightEx;
	$('#slideout-right').toggleClass('expanded');
	$('#slideout-right-arrow').toggleClass('expanded');
	if (rightEx) {
		$('#darkener').addClass('visible');
	}
	else if (!leftEx) {
		$('#darkener').removeClass('visible');
	}
}
/** slide out the left (timetable) pane */
function slideOutLeft() {
	"use strict";
	if (window.oneSlider && rightEx) {
		slideOutRight();
	}
	if (topEx) {
		slideOutTop();
	}
	if (botEx) {
		slideOutBottom();
	}
	leftEx = !leftEx;
	$('#slideout-left').toggleClass('expanded');
	$('#slideout-left-arrow').toggleClass('expanded');
	if (leftEx) {
		$('#darkener').addClass('visible');
	}
	else if (!rightEx) {
		$('#darkener').removeClass('visible');
	}
}


/** update the belltimes pane */
function updateRightSlideout() { // belltimes here
	"use strict";
	var text;
	text = "<div style='text-align: center;'><span class='big'>" + dow + " " + week + "</span><br /><table class='right-table' style='margin-left: auto; margin-right:auto;'><tbody>";
	var stupid = function(v) { return "Period " + v; };
	for (var i in belltimes.bells) {
		var part = belltimes.bells[i];
		text +="<tr><td class='bell-desc'>" + part.bell.replace(/^(\d)/, stupid) + "</td><td class='bell-time'>" + part.time + "</td></tr>";
	}
	text += "</tbody></table></div>";
	document.getElementById("slideout-right").innerHTML = text;
}
/** update the timetable pane - either show a prompt to log in/enter your timetable *or* show the timetable for today */
function updateLeftSlideout() {// timetable here
	"use strict";
	var text;
	if (timetable === null) {
		// prompt them to log in and create a timetable
		if (loggedIn) {
			text = "<div style='text-align: center;'><h1>Your timetable, here.</h1>";
			text += "You can see your timetable here.<br />";
			text += "It'll take about five minutes. You'll need a copy of your timetable.<br /><br /><br /><br />";
			text += "<a href='/timetable.php' class='fake-button'>Get Started</a></div>";
		}
		else {
			text = "<div style='text-align: center;'><h1>Your timetable, here.</h1>";
			text += "You can see your timetable here. Sign in with your Google account.<br />";
			text += "You can also sign in using your school email account:<br />";
			text += "<span style='word-wrap: break-word'>&lt;YourStudentID&gt;@student.sbhs.nsw.edu.au</span><br /><br /><br /><br />"; 
			text += "<a href='/login.php?urlback=/timetable.php&new-timetable' class='fake-button'>Sign In</a></div>";
		}
	}
	else {
		text = "<div style='text-align: center;' ><span class='big-title'>" + dow + " " + week + "</span><br /><table class='left-table' style='margin-left: auto; margin-right: auto;'><tbody>";
		var day = dow.substr(0,3).toLowerCase();
		var wk  = week.toLowerCase();
		var today = timetable[wk][day];
		for (var i in today) {
			var name = today[i].name;
			if (name === "") {
				name = "Free Period";
			}
			text += "<tr><td class='big'>" + (Number(i)+1) + "</td><td class='sidebar-name'>" + name + "</td><td class='sidebar-room'>" + today[i].room + "</td></tr>";
		}
		text += "</tbody></table></div>";
	}
	document.getElementById("slideout-left").innerHTML = text;
}

var d = NOW;
d.addSeconds(afterSchool ? 24*60*60 : 0);
$.getScript("http://student.sbhs.net.au/api/timetable/bells.json?date=" + (d.getFullYear() + (d.getMonth()+1) + d.getDate()) + "&callback=loadTimetable");

var DOCUMENT_READY = false;
var BELLTIMES_DONE = false;

/** store the timetable, if the document's ready, do all the setup. */
function loadTimetable(obj) {
	"use strict";
	window.belltimes = obj;
	BELLTIMES_DONE = true;
	if (DOCUMENT_READY) {
		begin();
	}
}

$(document).ready(function() { 
	"use strict";
	$('#old-ie-warn').css({"opacity": 0, "font-size": 0}); // we got this far... (older IEs will fail because jQuery 2.x doesn't support them)
	DOCUMENT_READY = true;  
	$('#slideout-top-arrow').click(slideOutTop);
	if (BELLTIMES_DONE) begin();
	if (window.actualMobile) return; // this stuff is unnecessary for mobile
	if (/compatible; MSIE 9.0;/.test(window.navigator.userAgent) && !window.localStorage.noIE9annoy && false ) { // TODO enable this. It might scare people off, though.
		$('#ie9-warn').css({"opacity": 1});
	}
	if (window.chrome && !window.chrome.app.isInstalled && false) { // TODO enable this
		$('#ohai-chrome').css({"opacity": 1});
	}
	setTimeout(function() { $('#ie9-warn').css({"opacity": 0}); }, 10000);
});

function tryLoadBells() { // try and reload the bells
	"use strict";
	$.getScript("http://student.sbhs.net.au/api/belltimes/bells.json?date=" + NOW.getDateStr() + "&callback=loadTimetable");
}

function isSchoolHolidays() {
	"use strict";
	return false; // nope
	/*var holS = new Date("2014-04-11");
	  var holE = new Date("2014-04-28");
	  if (window.hasOwnProperty("devMode") && window.devMode == true) {
	  return false;
	  }	

	  if (NOW.isAfter(holS) && NOW.isBefore(holE)) {
	  return true;
	  }
	  return false;*/
}

function getRandColor() {
	"use strict";
	return Math.round(Math.random()*255);//% 255;
}

function snazzify() {
	"use strict";
	var s = "#in";
	$(s).fadeIn().css({"color": "rgb("+getRandColor()+","+getRandColor()+","+getRandColor()+")"});
	setTimeout(snazzify, 500);
}

function begin() {
	"use strict";
	if (isSchoolHolidays()) {
		toggleExpando();
		$('body').css({"background-image": "url(/GOT.jpg) !important", "color": "black"});
		$('body').css({"background-image": "url(/GOT.jpg)"});
		$('#in').fadeIn().text('studystudystudystudystudystudystudy').css({"transition": "500ms ease"});
		snazzify();
		setTimeout(function() { $('#doge-notify').fadeOut(); }, 5000);
		return;
	}
	if (belltimes.status == "Error") { // well dang. TODO add default bells + display a warning when the bells failed to load.
		belltimes = window.defaultBells[NOW.getDay()];
		var types = ["B","C","A"];
		$('#bells-changed').text('These are the default belltimes for today. They might be wrong if an assembly or other event is happening today.');
		window.console.log(NOW.getWeek());
		belltimes.weekType = types[(NOW.getWeek()+1)%3];
		week = belltimes.weekType;
		dow = "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(",")[NOW.getDay()];
	}
	else { // show stuff.
		week = belltimes.weekType;
		dow  = belltimes.day;
		if (belltimes.bellsAltered) {
			$('#bells-changed').text('Bells Changed! Reason: ' + belltimes.bellsAlteredReason);
		}
	}
	redoDate();
	recalculateNextBell();
	updateTimeLeft();
	setInterval(updateTimeLeft, 1000);
	setTimeout(function() { $('#doge-notify').fadeOut(); }, 5000);
	window.console.log(NOW.getWeek());
	updateLeftSlideout();
	updateRightSlideout();
	$('#bells-changed').fadeIn();
	$(window).on('resize', doReposition);
	if (window.studentYear) {
		$('#year').html(window.studentYear + " &nbsp;&nbsp;<small><a href='javascript:void(0)' onclick='promptSetYear()'>Change</a></small>");
	}
	else {
		$('#year').html("(not set) <a href='javascript:void(0)' onclick='promptSetYear()'>Set</a>");
	}
}
function doReposition() { // reposition/resize things to fit.
	"use strict";
	if (window.innerWidth <= 510 || window.MOBILE) {
		$('.slideout').css({"width": "100%", "padding": "0"});
		window.oneSlider = true;
	}
	else if (window.innerWidth <= 625 && window.falseMobile) {
		$('.slideout').css({"width": "50%", "padding": "0"});
		window.oneSlider = false;
	}
	else {
		$('.slideout').css({"width": "40%", "padding": 0});
		window.oneSlider = false;
	}


	if (window.innerWidth <= 395) {
		window.MOBILE = true;
		window.falseMobile = true;
	}
	else if (window.falseMobile) {
		window.MOBILE = false;
	}
	if (window.MOBILE) {
		$('#period-name').css({"font-family": "Roboto", "font-size": "40px"});
		$('#countdown').css({"font-family": "Roboto", "font-size": "50px"});
	}
	var top1 = $('#period-name').height() + 80;
	$('#in').css({"top": top1});
	var top2 = $('#in').height();
	$('#countdown').css({"top": top1+top2});


}

function getNotices() {
	"use strict";
	$.getJSON("notices/dailynotices.php?codify=yes&date="+NOW.getDateStr(), processNotices).fail(function() {
		$('#slideout-top').html('<h1>Failed to load notices</h1><a href="javascript:void(0)" onclick="reloadNotices()">try again?</a>');
	});
}
// put the notices in the notice pane
function processNotices(data) {
	"use strict";

	var res = "<h1 style='text-align: center'>Notices for " + dow + " " + week + "</h1><a href='javascript:void(0)' id='reload-notices' onclick='reloadNotices()'>reload</a>";
	res += "Pick a year: <select id='notice-filter'><option value='.notice-row'>All years</option>";
	var year = (Number(studentYear) == Number.NaN ? studentYear : Number(studentYear));
	for (i=7; i <= 12; i++) {

		res += "<option value='.notice-"+i+"'" + (year == i ? "selected" : "") + ">Year " + i + "</option>";
	}
	res += "<option value='.notice-Staff'" + (year == "Staff" ? "selected" : "") + ">Staff</option></select>";
	res += "<span class='rightside'><a href='/notices/dailynotices.php?date="+NOW.getDateStr()+"'>Full notices</a></span>";
	res += "<table id='notices'><tbody>";
	var allNotices = data[0];
	var i = 0;
	for (i in allNotices) {
		var n = allNotices[i];
		var classes = 'notice-row';
		var ylist = n.years;
		for (var j in ylist) {
			classes += " notice-"+ylist[j];
		}
		res += "<tr id='notice-"+i+"' class='"+classes+"'><td class='for'>"+n.applicability+"</td><td class='info'><span class='notice-title'>"+n.title+"</span><span class='content'>"+n.content+"<span class='author'>"+n.author+"</span></span></td></tr>";
	}
	res+="</tbody></table>";
	if (i === 0) {
		res += "<h1>There are no notices!</h1>";
	}
	window.currentNoticesSpinner.stop();
	$('#slideout-top').html(res);
	doneNoticeLoad();
}
/** attaches onChange/whatever handlers to notices */
function doneNoticeLoad() {
	"use strict";
	$('.info').click(function() {
		$($(this).children('.content')[0]).slideToggle();
	});
	$('.content').slideToggle();
	$('#notice-filter').change(function() {
		$('.notice-row:not('+$(this).val()+')').fadeOut();
			$($(this).val()).fadeIn();
			});
		$('#notice-filter').change();
		$('#notice-toggle').click(function() {
			$('.content').slideToggle();
		});
		}
		/** format a date */
		function formatDate(d,js) {
			"use strict";
			var dom = d.getDate().toString();
			var mon = (d.getMonth()+1).toString();
			var yrs = d.getFullYear().toString();
			if (dom.length < 2) {
				dom = "0" + dom;
			}
			if (mon.length < 2) {
				mon = "0" + mon;
			}
			if (!js) {
				return dom +"/"+ mon +"/"+ yrs;
			}
			else {
				return yrs+"-"+mon+"-"+dom;
			}
		}

function getDiary() {
	"use strict";
	$.getJSON("diary.php?raw-json", processDiary);
}
/** generate a diary row for a JSON element */
function genDiaryRow(el) {
	"use strict";
	var date = new Date(formatDate(new Date(), true));
	var dueDate = new Date(el.due);
	var dStr = formatDate(dueDate);
	var due = "";
	var p = el.duePeriod;
	if (dueDate == date) {
		dStr = "<strong>Today</strong> (period " + p + ")";
	}
	else if (dueDate == (date-24*60*60) && !el.done) {
		dStr = "<strong class='diary-overdue'>Yesterday</strong> (period " + p + ")";
	}
	else if (dueDate == (date+24*60*60) && !el.done) {
		dStr = "<strong>Tomorrow</strong> (period " + p + ")";
	}
	else if (dueDate < date && !el.done) {
		dStr = "<strong class='diary-overdue'>OVERDUE!</strong> (due " + dStr + " period " + p + ")";
		due = "";
	}
	var text;
	if (window.actualMobile) {
		text = "<tr id='diary-"+window.newEntryID+"' onclick='mobileExpandDiary(event)'><td class='diary-name'>"+el.name+"&nbsp;&nbsp;&#9660;<div class='hidden due-date'>"+due+" "+dStr+"</div></td><td class='diary-subject'>"+el.subject+"&nbsp;&nbsp;&#9660;<div class='diary-notes hidden'>"+el.notes+"</div></td><td><input type='checkbox' onchange='diaryEntryDone(event)' "+(el.done ? "checked" : "")+" />&nbsp;<a href='javascript:void(0)' onclick='editDiary(event)'>edit</a>&nbsp;<a href='javascript:void(0)' onclick='deleteDiaryEntry(event)'>delete</a></td></tr>";
	}
	else {
		text = "<tr id='diary-"+window.newEntryID+"'><td class='diary-name'>"+el.name+"</td><td class='due-date'>" + due + " " + dStr + "</td><td class='diary-subject'>"+ el.subject+"</td><td class='diary-notes'>"+el.notes+"</td><td class='edit-wrapper'><input type='checkbox' onchange='diaryEntryDone(event)' "+ (el.done ? "checked" : "")+ " />&nbsp;<a href='javascript:void(0)' onclick='editDiary(event)'>edit</a>&nbsp;<a href='javascript:void(0)' onclick='deleteDiaryEntry(event)'>delete</a></td></tr>";
	}
	return text;
}
/** process the diary when it's been loaded */
function processDiary(diary) {
	"use strict";
	var rows, i;
	if (window.actualMobile) {
		rows = [];
	}
	else {
		rows = ["<tr><td style='border: 0px'>Name</td><td style='border: 0px'>Due</td><td style='border: 0px'>Subject</td><td style='border: 0px'>Notes</td><td style='border: 0px'>&nbsp;</td></tr>"];
	}
	//var date = new Date(formatDate(new Date(), true)); XXX: maybe unused
	window.diary = diary;
	for (i in diary) {
		var el = diary[i];
		window.newEntryID = i;
		rows.push(genDiaryRow(el));
	}
	var res = "<span id='diary-add' onclick='addDiaryEvent()'>+</span><a href='javascript:void(0)' id='diary-reload' onclick='reloadDiary()'>reload</a><h1 id='diary-header'>My Homework <span class='beta-tag'>Beta!</span></h1><table id='diary-table'><tbody>";
	for (i in rows) {
		res += rows[i];
	}
	res += "</tbody></table>";
	res += "";
	$('#slideout-bottom').html(res);
}

function getNewRow() {
	"use strict";
	if (window.actualMobile) {
		return "<tr id='newDRow'><td class='diary-name'><input placeholder='Name' type='text' /><br /><span class='diary-subject'><input placeholder='Subject' type='text' /></span></td><td><input placeholder='Date' type='text' class='date-in' /> Period <input style='width: 15px' type='text' class='period' /></td><td class='diary-desc'><textarea/><a href='javascript:void(0)' onclick='saveDiary()'>save</a></td></tr";
	}
	else {
		return "<tr id='newDRow'><td class='diary-name'><input placeholder='Name' type='text' /></td><td><input placeholder='Date' type='text' class='date-in' /> Period <input style='width: 15px' type='text' class='period'/></td><td class='diary-subject'><input placeholder='Subject' type='text' /></td><td class='diary-desc'><textarea/></td><td><a href='javascript:void(0)' onclick='saveDiary()'>save</a></td></tr>";
	}
}

function mobileExpandDiary(e) {
	"use strict";
	var td;
	if (e.target.nodeName.toLowerCase() == "tr") {
		td = $(e.target);
	}
	else {
		td = $(e.target).parents("tr");
	}
	$(td).find("*.hidden").slideToggle();
}

/** add a new row to add an entry to the diary table */
function addDiaryEvent() {
	"use strict";
	if (!window.diary) {
		console.error("addDiaryEvent - called before diary loaded!");
		return; // oops...
	}
	else if (window.addingEntry)
		return;
	var newRow = getNewRow();
	$('#diary-table').append(newRow);
	window.addingEntry = true;
	window.newEntryID = window.diary.length;
}
/** edit a row */
function editDiary(e) {
	"use strict";
	var id = Number($(e.target).parent().parent().attr("id").split("-")[1]);
	var el = diary[id];
	$('#diary-table #diary-'+id).replaceWith(getNewRow());
	var row = $('#newDRow *');
	row.filter('.diary-name > input').val(el.name);
	row.filter('.date-in').val(el.due);
	row.filter('.period').val(el.duePeriod);
	row.filter('.diary-subject > input').val(el.subject);
	row.filter('.diary-desc > textarea').val(el.notes);
	window.newEntryID = id;
}


/** save the content of the add to diary row */
function saveDiary() {
	"use strict";
	var row = $('#newDRow *');
	var name = row.filter('.diary-name input').val();
	var date = Date.parse(row.filter('.date-in').val());
	if (date === null) {
		row.filter('.date-in').val("").attr("placeholder", "Try again.");
		return;
	}
	var period = row.filter('.period').val();
	var subj = row.filter('.diary-subject input').val();
	var desc = row.filter('.diary-desc textarea').val();

	var data = {
		"name": name,
		"notes": desc,
		"subject": subj,
		"due": formatDate(date, true),
		"duePeriod": period,
		"done": false,
	};
	var tDiary = diary;
	tDiary[window.newEntryID] = data;
	var req = $.ajax({
		"type": "POST",
		"url": "diary.php",
		"data": {
			"json": JSON.stringify(tDiary),
		"update": true
		}
	});

	req.done(function(msg) {
		if (msg == "Ok") {
			window.addingEntry = false;
			var dRow = genDiaryRow(data, window.newEntryID);
			diary[window.newEntryID] = data;
			$('#newDRow').replaceWith(dRow);
		}
		else {
			$('#newDRow a').text('failed to save!');
			setTimeout(5000, function() { $('#newDRow a').text('save'); });
		}
	});		
}

function diaryEntryDone(e) {
	"use strict";
	var id = Number($(e.target).parent().parent().attr("id").split("-")[1]);
	diary[id].done = ($(e.target).find('input[type="checkbox"]').val() == "on" ? true : false);
	var req = $.ajax({
		"type": "POST",
		"url": "diary.php",
		"data": {
			"json": JSON.stringify(diary),
		"update": true
		}
	});

	req.done(function(msg) {
		if (msg != "Ok") {
			$(e.target).after("<span class='error'>failed to set done!</span>");
			$(e.target).find('input[type="checkbox"]').click();
			setTimeout(5000, function() { $('.error', e.target).remove(); });
		}
	});
}

function deleteDiaryEntry(e) {
	"use strict";
	var id = Number($(e.target).parent().parent().attr("id").split("-")[1]);
	var tDiary = diary;
	tDiary.splice(id, 1);
	var req = $.ajax({
		"type": "POST",
		"url": "diary.php",
		"data": {
			"json": JSON.stringify(tDiary),
		"update": true
		}
	});

	req.done(function(msg) {
		if (msg == "Ok") {
			$('#diary-'+id).fadeOut().remove();
			window.console.log("delete id: " + id);
			diary.splice(id, 1);
		}
		else {
			$('#diary-'+id+' .delete').text('failed to delete!');
			setTimeout(5000, function() { $('#diary-'+id+' .delete').text('delete'); });
		}
	});
}

function promptAddDiary() {
	"use strict";
	if (!loggedIn) {
		slideOutBottom();
		return;
	}
	var myNextBell = nextBell;
	if (!/\d$/.test(myNextBell.bell)) { // we're probably in a period!
		if (myNextBell.bell == "Roll Call") {
			// last period on the previous day
			var today = dow.toLowerCase().substr(0,3);
			var wk = week.toLowerCase();
			var prevDay = {"sat": "fri","sun": "fri", "mon": "fri", "tue": "mon", "wed": "tue", "thu": "wed", "fri": "thu"};
			var prevWeek = {"a": "c", "b": "a", "c": "b"};
			today = prevDay[today];
			if (today == "fri") {
				// wrap around one week backwards!
				wk = prevWeek[wk];
			}

		}
	}
}
/** return {'days': <numOfDays>, 'period': <period>, 'day': <day>, 'wk': <wk>} */
function getNextInstanceOf(today, wk, period) {
	"use strict";
	var nextDay = {"sat": "mon", "sun": "mon", "fri": "mon", "mon": "tue", "tue": "wed", "wed": "thu", "thu": "fri"};
	var nextWeek = {"a": "b", "b":"c", "c": "a"};
	var lesson = timetable[wk][today][period];
	var daysPast = 0;
	var sDay = nextDay[today];
	if (sDay == "mon") {
		sWk = nextWeek[wk];
		daysPast = 3;
	}
	else {
		sWk = wk;
		daysPast = 1;
	}
	var cWk = sWk;
	var cDay = sDay;
	var done = false;
	var i,j,k;
	for (i = 0; i < 3; i++) {
		for (j = 0; j < 5; j++) {
			var s = timetable[cWk][cDay];
			for (k in s) {
				if (s[k].name == lesson.name) {
					// we FOUND IT!
					done = true;
					break;
				}
			}
			if (done) break;
			daysPast++;
			cDay = nextDay[cDay];
		}
		if (done) break;
		daysPast += 2; // sat, sun
		cWk = nextWeek[cWk];
	}
	return {"daysLeft": daysPast, "wk": cWk, "day": cDay, "period": k};

}

function getLastLesson() {
	"use strict";
	var currently = nextBellIdx;
	var lesson = null;
	var period, day, wk;
	for (true; currently >= 0; currently--) {
		if (/^\d/.test(belltimes.bells[currently].bell)) {
			// found last period.
			day = dow.substr(0,3).toLowerCase();
			wk = week.toLowerCase();
			period = Number(belltimes.bells[currently].bell);
			lesson = timetable[wk][day][period-1];
			if (lesson.name === "") {
				continue; // free period, skip it.
			}
			break;
		}
	}
	return {"lesson": lesson, "bell": belltimes.bells[currently], "period": period-1};
}

function promptAddHomework() {
	"use strict";
	var lessonData = getLastLesson();
	var day = dow.substr(0,3).toLowerCase();
	var wk = week.toLowerCase();
	var nextInstance = getNextInstanceOf(day, wk, lessonData.period);
	var ln = "<div id='add-homework-popover'><h1 class='mini-header'>Homework for " + lessonData.lesson.name + "</h1>";
	ln += "<div class='input-wrapper'>";
	ln += "Name: <input class='diary-name' type='text' /><br />";
	ln += "Due: <input class='diary-due' type='text' value='+" + nextInstance.daysLeft + " days' /><br />";
	ln += "Period <input class='diary-period' type='number' value='" + (""+nextInstance.period+1).replace(/^0+/, "") + "' /><br />";
	ln += "Subject: <input class='diary-subject' type='text' value='"+lessonData.lesson.name+"' /><br />";
	ln += "<span id='additional-notes'>Additional Notes:</span> <textarea class='diary-desc' /><br /></div></div>";
	$(document.body).append(ln);
}

function toggleExpando() {
	"use strict";
	$('#expand-countdown,#collapse-countdown').toggleClass('hidden');
	if ($('#expand-countdown').hasClass('hidden')) {
		// expand countdown
		$('#period-name,#in,#sidebar,#faq-link,#feedback,#debug').fadeOut();
		$('#countdown').css({"top": "50%", "margin-top": "-127px", "font-size": "12em"});
		$('.arrow').css({"opacity": 0});
		// TODO do people actually want/care about this?
		/*if (document.body.requestFullscreen) { 
		  document.body.requestFullscreen();
		  } else if (document.body.msRequestFullscreen) {
		  document.body.msRequestFullscreen();
		  } else if (document.body.mozRequestFullScreen) {
		  document.body.mozRequestFullScreen();
		  } else if (document.body.webkitRequestFullScreen) {
		  document.body.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
		  }*/
	}
	else {
		$('#period-name,#in,#sidebar,#faq-link,#feedback,#debug').fadeIn();
		$('.arrow').css({"opacity": ""});
		$('#countdown').css({"top": "", "margin-top": "", "font-size": ""});
		$(window).resize();
		/*if (document.exitFullscreen) {
		  document.exitFullscreen();
		  } else if (document.msExitFullscreen) {
		  document.msExitFullscreen();
		  } else if (document.mozCancelFullScreen) {
		  document.mozCancelFullScreen();
		  } else if (document.webkitExitFullscreen) {
		  document.webkitExitFullscreen();
		  }*/
	}
}

function dismissIE9() {
	"use strict";
	window.localStorage.noIE9annoy = true;
	$('#ie9-warn').css({"opacity": 0});
}
/** prompt to set a year */
function promptSetYear() {
	"use strict";
	$('#year').html("<input type='text' id='new-year' /><br /><br /><a class='fake-button' href='javascript:void(0)' onclick='saveYear()'>Save Year!</a>");
}
/** update the year */
function saveYear() {
	"use strict";
	var newYear = $('#new-year').val();
	if (!/7|8|9|10|11|12|Staff/.test(newYear)) {
		$('#year').append("<br /><br />Nope. Valid values are: 7, 8, 9, 10, 11, 12 or Staff");
		return;
	}
	var req = $.ajax({
		"type": "POST",
		"url":  "update_year.php",
		"dataType": "text",
		"data": {
			"year": newYear
		}
	});
	$('#year > .fake-button').text("Saving...");

	req.done(function(msg) {
		var years = ["", "7", "8", "9", "10", "11", "12", "Staff"];
		if (msg == "Ok") {
			$('#year').html(newYear + "&nbsp;&nbsp;<small><a href='javascript:void(0)' onclick='promptSetYear()'>Set</a></small>");
			studentYear = newYear;
			if (noticesLoaded) {
				$('#notice-filter')[0].selectedIndex = years.indexOf(studentYear);
				$('#notice-filter').change();
			}
		}
		else {
			$('#year > .fake-button').text("Try again...");
		}
	});
}		
// load jquery mobile (+ the swipe up/down support) if it's a device that supports touch.
yepnope([{
	test: Modernizr.touch,
yep : ["/script/jquery.mobile.custom.min.js"],
complete: function() {
	"use strict";
	if ($.mobile) {
		$(document).ready(function() { 
			$(document).on('swipeleft', function(ev) { 
				var start = ev.swipestart.coords[0];
				var rightPanel = (start > (window.innerWidth/2));
				if (leftEx && (window.oneSlider || !rightPanel)) {
					slideOutLeft();
				}
				else if ((rightPanel || window.oneSlider) && !rightEx) {
					slideOutRight();
				}

			});
			$(document).on('swiperight', function(ev) { 
				var start = ev.swipestart.coords[0];
				var leftPanel = (start < (window.innerWidth/2));
				if (rightEx && (window.oneSlider || !leftPanel)) {
					slideOutRight();
				}
				else if ((leftPanel || window.oneSlider) && !leftEx) {
					slideOutLeft();
				}
			});
			$(document).on('swipeup', function() {
				if (topEx) {
					slideOutTop();
				}
				else if (!botEx) {
					slideOutBottom();
				}
			});
			$(document).on('swipedown', function() {
				if (!topEx) {
					slideOutTop();
				}
				else if (botEx) {
					slideOutBottom();
				}
			});
		});
		if (window.actualMobile || /ipad|android/i.test(navigator.userAgent)) { // show the swipe info!
			$('#swipe-info').css({"opacity": 1});
			setTimeout(function() { $('#swipe-info').css({"opacity": 0}); }, 5000);
		}
	}
}
}]);


(function(a){"use strict";if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))window.MOBILE=true;})(navigator.userAgent||navigator.vendor||window.opera);
