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
 var today = {};
 function loadToday() {
 	if (!config.loggedIn) return;
 	if (!window.today || !window.today.httpStatus) {
 		$('#left-pane .umad').html('¯\\_(ツ)_/¯ Loading ¯\\_(ツ)_/¯');
 		showTodayTimeout();
 	}
 	window.todayLoading = true;
 	updateSidebarStatus();
 	if (window.belltimes && belltimes.status == 'OK') {
 		if ((belltimes.day + belltimes.weekType) in localStorage) {
 			try {
 				var obj = JSON.parse(localStorage[belltimes.day + belltimes.weekType]);
 				if (obj.httpStatus == 200) {
 					obj.stale = true;
 					obj.displayVariations = false;
 					EventBus.post('today', obj);
 				}
 			} catch (e) {
 				console.log('couldn\'t parse json, ditching it.');
 			}
 		}
 	}
 	if (!config.loggedIn) {
 		console.log('not logged in, don\'t bother');
 		return;
 	}
 	$.getJSON('/api/today.json', function(data, status, xhr) {
 		if (data.httpStatus == 200) {
 			window.localStorage[data.today.replace(' ','')] = JSON.stringify(data);
 			if (!belltimes || belltimes.status != 'OK') {
 				reloadBells();
 			}
 			clearTimeout(window.timetableReloadPromptTimeout);
 			window.todayLoading = false;
 			updateSidebarStatus();
 			EventBus.post('today', data);
 		}
 	});

 }

 EventBus.on('today', function(ev, data) {
 	window.today = data;
 	cachedCountdownEvent = false;
 	getNextCountdownEvent();
 }, true);

 function showTodayTimeout() {
 		window.timetableReloadPromptTimeout = setTimeout(function() {
			$('#left-pane .umad').html('Loading your timetable is taking a looong time... <a href="javascript:void(0)" onclick="loadToday()">Try again?</a>');
		}, 10000);
 }
loadToday();
