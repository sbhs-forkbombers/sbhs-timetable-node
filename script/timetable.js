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
 	$.getJSON('/api/today.json', function(data) {
 		if (data.httpStatus == 200) {
 			window.localStorage[data.today.replace(' ','')] = JSON.stringify(data);
 			if (!belltimes || belltimes.status != 'OK') {
 				reloadBells();
 			}
 			EventBus.post('today', data);
 		}
 	});

 }

 EventBus.on('today', function(ev, data) {
 	window.today = data;
 	cachedCountdownEvent = false;
 	getNextCountdownEvent();
 }, true);

 loadToday();
