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

function loadNotices() {
	$('#top-pane .umad').html('¯\\_(ツ)_/¯ Loading ¯\\_(ツ)_/¯');
	showNoticesTimeout();
	var ds = getNextSchoolDay().format('YYYY-MM-DD');
	window.noticesLoading = true;
	updateSidebarStatus();
	$.getJSON('/api/notices.json?date='+ds, function(data) {
		window.notices = data
		window.noticesLoading = false;
		clearTimeout(window.noticesReloadPromptTimeout);
		updateSidebarStatus();
		EventBus.post('notices', data);
	});
}

function loadBarcodeNews() {
	var ds = getNextSchoolDay().format('YYYY-MM-DD');
	$.getJSON('/api/barcodenews/list.json?date=' + ds, function(data) {
		window.barcodenews = data;
		EventBus.post('barcodenews', data);
	});
}

function showNoticesTimeout() {
	window.noticesReloadPromptTimeout = setTimeout(function() {
			$('#top-pane .umad').html('Loading the notices is taking a looong time... <a href="javascript:void(0)" onclick="loadNotices(); loadBarcodeNews()">Try again?</a>');
		}, 10000);
}

if (config.loggedIn) {
	EventBus.on('pageload', function() {
		showNoticesTimeout();
	});
}

loadNotices();
loadBarcodeNews();