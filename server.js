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
var express = require('express'),
	config = require('./config'),
	cookieParser = require('cookie-parser'),
	fs = require('fs'),
	util = require('util'),
	colours = require('./lib/colours');
	lessMiddleware = require('./lib/less-middleware'),
	auth = require('./lib/auth'),
	api = require('./lib/api'),
	schoolday = require('./lib/schoolday');

global.sessions = require('./lib/session');

var app = express();
app.set('views', './dynamic');
app.set('view engine', 'jade');

app.use(cookieParser());

function _zfill(string, length) {
	if (string.length >= length) return string;
	string = '000000000000' + string;
	return string.substr(string.length-length);
}

app.use(function (req, res, next) {
	var now = new Date();
	var date = _zfill(now.getFullYear(), 4) + '-' + _zfill(now.getMonth(), 2) + '-' + _zfill(now.getDate(), 2) + ' ' + _zfill(now.getHours(), 2) + ':' + _zfill(now.getMinutes(), 2) + ':' + _zfill(now.getSeconds(), 2);
	console.log(date + ' ' + res.statusCode + ' ' + req.url);
	if (!req.cookies.SESSID) {
		if (req.query.SESSID) {
			req.cookies.SESSID = req.query.SESSID;
		} else {
			console.log(res.cookie);
			var expiry = new Date();
			expiry.setDate(expiry.getDate() + 90);
			var newCookie = sessions.createSession();
			res.cookie('SESSID', newCookie, {'expires': expiry, httpOnly: false});
			req.cookies.SESSID = newCookie;
		}

	}
	next();
});

app.use('/less', lessMiddleware(__dirname + '/style', function (req, res) {
	return req.query;
}));

app.use('/script', express.static('script'));
app.use('/static', express.static('static'));
app.use('/style', express.static('style')); 
app.use('/api', auth.AutoRefresher(config));

app.get('/', function(req, res) {
	var loggedIn = req.cookies.SESSID && sessions.getSessionData(req.cookies.SESSID).accessToken != undefined;
	var vars = {
		loggedIn: loggedIn,
		colour: req.query.colour || 'white',
		inverted: 'invert' in req.query,
		HOLIDAYS: schoolday.isHolidays(),
		cscheme: colours.get(req.query.colour || 'default' , 'invert' in req.query),
	};
	if (vars.HOLIDAYS) {
		vars.holidayCfg = {
			video: '9bZkp7q19f0',
			background: 'url(/static/exciting.gif) repeat',
			text: '2012 called<br />they want their memes back'
		};
	}
	var args = {
		scheme:  vars.cscheme,
		args: JSON.stringify(vars),
		config: vars 
	}
	
	res.render('index', args);
});

app.use('/logout', sessions.deleteHandler);

app.use('/favicon.ico', express.static('static/favicon.ico'));
app.use('/icon.png', express.static('static/icon-hires.png'));
app.use('/config.js', express.static('config_sample.js'));

app.get('/try_do_oauth', auth.FlowInitialiser(config));
app.get('/login', auth.FlowFinisher(config, '/try_do_oauth'));
app.get('/api/:api/:subapi?', api);

app.use(function(req, res, next) {
	res.status(404);
	fs.readFile('static/404.html', {'encoding': 'utf8'}, function(err, file) {
		if (err) {
			console.error('An error while trying to get the 404 page. -.-');
			console.error(err.stack);
			res.send('<!DOCTYPE html><html><head><style>body{background-color:black;color:white;font-family:Comic Sans MS, Papyrus, sans-serif;} a{font-size:140px;text-decoration:none;color:white}</style><title>404 - ASK 4 COMPUTER HALP OH MAHN</title>'+
				'<body><a href="https://reddit.com/r/Ooer">OH MAN I AM NOT GOOD WITH COMPUTER PLZ TO HELP</a><div style="position:fixed;bottom:0;left:0">404 not found :(</div></body></html>');
			return;
		}
		res.send(file);
	});
})

app.use(function(err, req, res, next) {
	console.error(err.stack);
	res.status(500);
	if (req.xhr) {
		res.send({error: 'internal server error', status: 500});
		return;
	}
	var isEasterEgg = (Math.floor(Math.random() * 10)) > 5;
	fs.readFile('static/500' + (isEasterEgg ? '.8' : '') + '.html', {'encoding': 'utf8'}, function(err, file) {
		if (err) {
			console.error('ANOTHER error while trying to get 500. -.-');
			console.error(err.stack);
			res.send('<!DOCTYPE html><html><head><style>body{background-color:black;color:white;font-family:Comic Sans MS, Papyrus, sans-serif;} a{font-size:140px;text-decoration:none;color:white}</style><title>ASK 4 COMPUTER HALP OH MAHN</title>'+
				'<body><a href="https://reddit.com/r/Ooer">OH MAN I AM NOT GOOD WITH COMPUTER PLZ TO HELP</a><div style="position:fixed;bottom:0;left:0">Something really weird is going on. We\'re working on it. Check back soon.</div></body></html>');
			return;
		}
		res.send(file);
	});
	
});

var server = app.listen(config.port || 8080, config.ipv4_ip || '0.0.0.0', function() {
	console.log('listening on %s:%s', server.address().address, server.address().port);
});
