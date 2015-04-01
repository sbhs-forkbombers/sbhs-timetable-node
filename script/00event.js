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

window.EventBus = {};
(function(EventBus) {

	EventBus.listeners = {};

	EventBus.on = function _on(event, callback, priority) {
		console.log(this);
		if (!(event in this.listeners)) {
			this.listeners[event] = [callback];
		} else {
			if (priority) {
				this.listeners[event].unshift(callback);
			} else {
				this.listeners[event].push(callback);
			}
		}
	}

	EventBus.post = function _post(event, data) {
		var args = arguments;
		var that = this;
		if (!(event in this.listeners)) {
			console.warn('No listeners for', event);
			return;	
		}
		setTimeout(function() {
			var i = 0;
			for (i = 0; i < that.listeners[event].length; i++) {
				that.listeners[event][i].apply(that, args);
			}
		}, 0);
	}
})(window.EventBus);

moment.fn.fromNowCountdown = function() {
	var diff = Math.abs(moment().diff(this, 's'));
	var seconds = (diff % 60) + '';
	diff = Math.floor(diff/60);
	var minutes = (diff % 60) + '';
	diff = Math.floor(diff/60);
	if (seconds.length < 2) {
		seconds = '0' + seconds;
	}
	if (minutes.length < 2) {
		minutes = '0' + minutes;
	}
	if (diff > 0) {
		return diff + 'h ' + minutes + 'm ' + seconds + 's';
	}
	return minutes + 'm ' + seconds + 's';
}
