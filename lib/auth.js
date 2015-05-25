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
var request = require('request');
//	sessions = require('./session');

module.exports.FlowInitialiser = function(opts) { /*secret, client ID, redirect uri*/
	return function(req, res, next) {
		
		var sessID = req.cookies.SESSID;
		/*if (!req.cookies.SESSID) {
			sessID = sessions.createSession();
			res.set('Cookie', 'SESSID='+sessID+'; Path=/; Expires=' + new Date(Date.now() + 60*60*24*90*1000));
		}*/
		res.set('Location', 'https://student.sbhs.net.au/api/authorize?response_type=code&client_id=' + encodeURIComponent(opts.clientID)
			+ '&redirect_uri=' + encodeURIComponent(opts.redirectURI)
			+ '&scope=all-ro&state=' + encodeURIComponent(sessID));
		res.sendStatus(302);
		res.end();
	}
};

module.exports.AutoRefresher = function(opts) {
	return function(req, res, next) {
		var sessID = req.cookies.SESSID;
		var session = sessions.getSessionData(sessID);
		if (typeof next !== 'function') {
			next = function() {};
		}
		if (!session) {
			next();
			return;
		}
		if (Date.now() > session.accessTokenExpires) {
			var refreshToken = session.refreshToken;
			request.post({
				'uri': 'https://student.sbhs.net.au/api/token',
				'headers': {
					'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
				},
				'body':'grant_type=refresh_token&refresh_token=' + refreshToken 
						+ '&redirect_uri='+encodeURIComponent(opts.redirectURI) 
						+ '&client_id='+encodeURIComponent(opts.clientID) 
						+ '&client_secret='+ opts.secret
			}, function(err, resp, data) {
				if (err) {
					next();
					return;
				}
				try {
					var json = JSON.parse(data);
					session.accessToken = json.access_token;
					session.accessTokenExpires = Date.now() + (1000 * 60 * 60);
					sessions.setSessionData(sessID, session);
					next();
				} catch (e) {
					console.log(e);
					next();
				}
			});
		} else {
			next();
		}

	}
};

module.exports.FlowFinisher = function(opts, authFlowInitPath) {
	return function(req, res, next) {
		var sessID = req.cookies.SESSID;
		if ('error' in req.query) {
			res.set('Location', '/?denied=1');
			res.sendStatus(302);
			res.end();
			return;
		}
		var _req = request.post({
			'uri': 'https://student.sbhs.net.au/api/token',
			'body': 'grant_type=authorization_code&code=' + req.query.code 
					+ '&redirect_uri=' + encodeURIComponent(opts.redirectURI) 
					+ '&client_id=' + encodeURIComponent(opts.clientID) 
					+ '&client_secret=' + opts.secret 
					+ '&state=' + encodeURIComponent(req.query.state) + '\n',
			'headers': {
				'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
			}
		}, function(err, resp, data) {
			try {
				var json = JSON.parse(data);
				if (json.error == 'invalid_grant') {
					res.set('Location', authFlowInitPath);
					res.sendStatus(302);
					res.end();
					return;
				}
				var sess = sessions.getSessionData(sessID);
				res.set('Location', '/?loggedIn=true');
				res.sendStatus(302);
				res.end();
				sess.accessToken = json.access_token;
				sess.refreshToken = json.refresh_token;
				sess.accessTokenExpires = Date.now() + (1000 * 60 * 60);
				sess.refreshTokenExpires = Date.now() + (1000 * 60 * 60 * 24 * 90);
				sessions.setSessionData(sessID, sess);

			} catch (e) {
				console.error(e);
				res.set('Location', '/?loginFailed');
				res.sendStatus(302);
				res.end();
			}
		})

	}
};
