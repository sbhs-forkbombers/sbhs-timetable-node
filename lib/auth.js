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
/* jshint -W098 */

var request = require('request'),
	config = require('../config.js');

var secret = config.secret,
	redirectURI = config.redirectURI,
	clientID = config.clientID;

function httpHeader(res, loc) {
	'use strict';
	res.writeHead(302, {
		'Location': loc
	});
}

module.exports = {
	'getAuthCode': function(res, SESSID) {
		'use strict';
		httpHeader(res,
			'https://student.sbhs.net.au/api/authorize?response_type=code&client_id='+encodeURIComponent(clientID) + '&redirect_uri='+encodeURIComponent(redirectURI) + '&scope=all-ro&state='+encodeURIComponent(SESSID)
		);
		res.end();
	},
	'getAuthToken': function(res, uri, cb, redir) {
		'use strict';
		if ('error' in uri.query) {
			console.log('redir to /?denied');
			httpHeader(res, '/?denied=true');
			res.end();
			return;
		} else if ('code' in uri.query) {
			var onData = function(err, resp, c) {
				var z = JSON.parse(c);
				var session = global.sessions[res.SESSID];
				if (redir) {
					httpHeader(res, '/?loggedIn=true');
					res.end();
				}
				session.accessToken = z.access_token;
				session.refreshToken = z.refresh_token;
				session.accessTokenExpires = Date.now() + (1000 * 60 * 60);
				session.refreshTokenExpires = Date.now() + (1000 * 60 * 60 * 24 * 90);
				global.sessions[res.SESSID] = session;
				if (typeof cb === 'function') {
					cb();
				}
			};
			var req = request.post({
				'uri': 'https://student.sbhs.net.au/api/token',
				'body': 'grant_type=authorization_code&code='+uri.query.code + '&redirect_uri='+encodeURIComponent(redirectURI) + '&client_id='+encodeURIComponent(clientID) + '&client_secret='+secret + '&state=' + encodeURIComponent(uri.query.state) + '\n',
				'headers': {
					'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
				}
			}, onData);
		}
	},
	'refreshAuthToken': function(refreshToken, sessID, cb) {
		'use strict';
		var onData = function (err, res, c) {
			if (err) {
				cb();
				return;
			}
			var z = JSON.parse(c);
			var session = global.sessions[sessID];
			session.accessToken = z.access_token;
			session.accessTokenExpires = Date.now() + (1000 * 60 * 60);
			global.sessions[sessID] = session;
			if (typeof cb === 'function') {
				cb();
			}
		};

		var req = request.post({
			'uri': 'https://student.sbhs.net.au/api/token',
			'headers': {
				'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
			},
			'body':'grant_type=refresh_token&refresh_token=' + refreshToken + '&redirect_uri='+encodeURIComponent(redirectURI) + '&client_id='+encodeURIComponent(clientID) + '&client_secret='+secret
		}, onData);
	},
	'refreshTokenIfNeeded': function(sessID, cb) {
		'use strict';
		var session = global.sessions[sessID];
		if (Date.now() > session.accessTokenExpires) {
			module.exports.refreshAuthToken(session.refreshToken, sessID, cb);
		}
		else {
			console.log(Date.now(),'<',session.accessTokenExpires);
			if (typeof cb === 'function') {
				cb();
			}
		}
	}
};
