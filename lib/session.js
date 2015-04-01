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

var fs = require('fs'),
	uuid = require('node-uuid');

if (!('_sessions' in global)) {
	console.log('[session] initialising _sessions to be empty...');
	global._sessions = {};
}

function log() {
	/* jshint validthis: true */
	'use strict';
	if (process.env.NODE_ENV !== 'test') {
		console.log.apply(this, arguments);
	}
}


(function(session) {
	/*jshint validthis: true */
	'use strict';
	session.sessionPath = require('../config.js').sessions;
	var _lastSessionWriteTime = 0;
	session.loadSessions = function loadSessions() {
		if (fs.existsSync(this.sessionPath)) {
			_sessions = JSON.parse(fs.readFileSync(this.sessionPath));
			_lastSessionWriteTime = Date.now();
		} else {
			log('[session]',this.sessionPath,'doesn\'t exist! Ignoring.');
		}
	};

	session.wipeSessions = function wipeSessions() {
		_sessions = {};
	};

	session.loadSessions();
	session.getSessions = function getSessions() { // only use this in tests
		return _sessions;
	};

	session.setSessions = function setSessions(s) { // only use this in tests
		_sessions = s;
	};

	session.saveSessions = function saveSessions(cb) {
		/*if (Date.now() - _lastSessionWriteTime < 1000 * 60) {
			return; // don't bother
		}
		_lastSessionWriteTime = Date.now();*/
		var start = Date.now();
		if (typeof cb !== 'function') {
			cb = function(err) {
				if (err) {
					log('[session] Failed to write sessions!');
					log(err.stack);
				} else {
					log('[session] Saved', Object.keys(_sessions).length, 'sessions in', (Date.now()-start) + 'ms');
				}
			};
		}
		fs.writeFile(this.sessionPath, JSON.stringify(_sessions), cb);
	};

	session.saveSessionsSync = function saveSessionsSync() {
		var start = Date.now();
		try {
			fs.writeFileSync(this.sessionPath, JSON.stringify(_sessions));
		} catch (err) {
			log('[session] Failed to write sessions!');
			log(err.stack);
			return;
		}
		log('[session] Saved', Object.keys(_sessions).length, '_sessions in', (Date.now()-start) + 'ms');

	};

	session.cleanSessions = function cleanSessions() {
		/* Remove old (or otherwise) _sessions from the store and save everything else to the filesystem */
		var cleaned = 0;
		for (var i in _sessions) {
			if (DEBUG) {
				log('[sessions_debug] Considering session for expiry. Length:',Object.keys(_sessions[i]).length,' Expiry:',_sessions[i].expires,'time left:',Math.floor((_sessions[i].expires - Date.now())/1000), 'seconds');
			}
			if (_sessions[i].expires < Date.now()) {
				delete _sessions[i];
				cleaned++;
				if (DEBUG) {
					log('[sessions_debug] 10/10 would clean again');
				}
			} else if (Object.keys(_sessions[i]).length < 2) { // empty session
				delete _sessions[i];
				cleaned++;
				if (DEBUG) {
					log('[sessions_debug] 11/10 would clean again');
				}
			} else if (DEBUG) {
				log('[sessions_debug] 0/10 would not recommend');
			}
		}
		log('[session] Cleaned ' + cleaned + ' sessions');
		session.saveSessions();
	};

	session.createSession = function createSession() {
		var id = uuid.v4();
		_sessions[id] = { expires: Date.now() + (1000 * 60 * 60 * 24 * 90) };
		console.log('new session',id);
		return id;
	};

	session.getSession = function getSession(cookies) {
		if (typeof cookies !== 'string') {
			return null;
		}
		
		var ckRes = {};
		cookies.split(';').forEach(function (ck) {
			var parts = ck.split('=');
			ckRes[parts.shift().trim()] = parts.join('=').trim();
		});
		if ('SESSID' in ckRes) {
			return ckRes.SESSID;
		} else {
			return null;
		}	
	};

	session.getSessionData = function getSessionData(sessid) {
		if (sessid in _sessions && !_sessions.hasOwnProperty(sessid)) return {}; // tut tut
		if (sessid in _sessions) {
			return _sessions[sessid];
		} else {
			_sessions[sessid] = {};
			return _sessions[sessid];
		}
	};

	session.setSessionData = function setSessionData(sessid, data) {
		if (sessid in _sessions) {
			_sessions[sessid] = data;
		}
		session.saveSessions();
	};

	session.deleteHandler = function deleteHandler(req, res, next) {
		if (req.cookies.SESSID && _sessions.hasOwnProperty(req.cookies.SESSID)) {
			delete _sessions[req.cookies.SESSID];
		}
		res.setHeader('Location', '/');
		res.sendStatus(302);
	}
})(module.exports);

