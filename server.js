/*
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

/* the gnustomp-forkbomb style guide:
 * Single tabs for indentation
 * Single quotes for strings
 * Opening braces on the same line as the statement
 * Spaces around operators
 * Empty line after a function defenition
 */

var all_start = Date.now();
console.log('[core] Loading...');
/* Requires */
var http = require('http'),
	fs = require('fs'),
	jade = require('jade'),
	url = require('url'),
	db = require('./lib/database.js'),
	auth = require('./lib/auth.js'),
	apis = require('./lib/api.js'),
	config = require('./config.js'),
	request = require('request');

/* Variables */
var secret = config.secret,
	clientID = config.clientID,
	redirectURI = config.redirectURI,
	forcedETagUpdateCounter = 0,
	cachedBells = {},
	index_cache, ipv4server, ipv6server, unixserver;
sessions = {}; // global

console.log('[core] Initialised in in ' + (Date.now() - all_start) + 'ms');

require('./variables.js'); // set globals appropriate to status - dev (DEBUG = true) or release (DEBUG = false and GIT_RV set)
if (!RELEASE) {
	GIT_RV = fs.readFileSync('.git/refs/heads/master').toString().trim();
	var watcher = fs.watch('.git/refs/heads/master', { persistent: false }, function() {
		'use strict';
		GIT_RV = fs.readFileSync('.git/refs/heads/master').toString().trim();
	});
}
fs.writeFile('.reload', '0');

var jade_opts = {
	pretty: DEBUG,
	compileDebug: DEBUG
};

function serverError() {
	'use strict';
	return fs.createReadStream('static/500.html');
}

function compile_jade(path) {
	'use strict';
	try {
		var mopts = jade_opts;
		mopts.filename = path;
		return jade.compile(fs.readFileSync(path), mopts);
	} catch (e) {
		console.error('!!! Failed to compile jade "'+path+'"!!! Stack trace:');
		console.error(e.stack);
		return serverError;
	}
}

function cache_index() {
	'use strict';
	console.log('[core] Caching index page... (hangup to re-cache)');
	var jade_comp = Date.now();
	var idx = compile_jade('dynamic/index.jade');
	index_cache = idx({title: ''});
	if (index_cache == serverError) {
		console.warn('WARNING: Encountered an error while caching index page. Fix errors, and then hangup to reload.');
	}
	console.log('[core] Index page cached in ' + (Date.now() - jade_comp) + 'ms');
}

function cleanSessions() {
	'use strict';
	var start = Date.now(),
		cleaned = 0;
	for (var i in global.sessions) {
		if (global.sessions[i].expires < Date.now()) {
			delete global.sessions[i];
			cleaned++;
		}
		else if (Object.keys(global.sessions[i]).length < 2) { // not storing anything in the session, so it's just eating memory.
			delete global.sessions[i];
			cleaned++;
		}
	}
	console.log('[core] Cleaned ' + cleaned + ' sessions');
}

var reloadWatcher = fs.watch('.reload', { persistent: false }, function() {
	'use strict';
	cache_index();
	cleanSessions();
});

process.on('SIGHUP', function() {
	'use strict';
	cache_index();
	cleanSessions();
});

process.on('SIGINT', function() {
	'use strict';
	unixserver.close(function() { global.unixDone = true; });
	ipv4server.close(function() { global.ipv4Done = true; });
	ipv6server.close(function() { global.ipv6Done = true; });
	fs.writeFileSync('sessions.json', JSON.stringify(global.sessions));
	console.log('Saved sessions.');
});


function httpHeaders(res, response, contentType, dynamic, headers) {
	'use strict';
	var date;
	dynamic = dynamic || false;
	headers = headers || {};
	if (!('Set-Cookie' in headers) && 'SESSID' in res) {
		headers['Set-Cookie'] = 'SESSID='+res.SESSID+'; Max-Age=36000';
	}
	if (dynamic || DEBUG) { // disable caching
		headers['Cache-Control'] = 'no-cache';
	} else if (!dynamic) {
		date = new Date();
		date.setYear(date.getFullYear() + 1);
		headers.Expires = date.toGMTString();
		//	headers.ETag = GIT_RV+'_'+forcedETagUpdateCounter;	// TODO better ETags. This *will* work in production because new git revisions will be the only way updates occur. 
		// SIGHUP'ing the process will force every client to re-request resources.
	}
	headers['Content-Type'] = contentType + '; charset=UTF-8';
	res.writeHead(response, headers);
	return res;
}

function getBelltimes(date, res) {
	'use strict';
	if (date === null || date === undefined || !/\d\d\d\d-\d?\d-\d?\d/.test(date)) {
		res.end(JSON.stringify({error: 'Invalid Date!'}));
	}
	if (date in cachedBells) {
		res.end(cachedBells[date]);
	} else {
		request('http://student.sbhs.net.au/api/timetable/bells.json?date='+date,
			function(err, r, b) {
				if (err || r.statusCode != 200) {
					if (err) {
						console.error('failed to get bells for',date,' err='+err);
						res.end('{"error": "internal", "statusCode": 500}');
					} else {
						console.error('Got a ' + r.statusCode + ' from SBHS for the belltimes for ' + date);
						res.end('{"error": "remote", "statusCode":'+r.statusCode+'}');
					}
					return;
				}
				cachedBells[date] = b;
				res.end(b);
			}
		);
	}
}

function genSessionID(req) {
	'use strict';
	var ua = req.headers['user-agent'];
	var buf = new Buffer(Date.now().toString() + ua + Math.floor(Math.random()*100));
	return buf.toString('hex');
}

function getCookies(s) {
	'use strict';
	var res = {};
	s.split(';').forEach(function (ck) {
		var parts = ck.split('=');
		res[parts.shift().trim()] = parts.join('=').trim();
	});
	return res;
}

function onRequest(req, res) {
	/*jshint validthis: true*/
	'use strict';
	var start = Date.now(),
		genSession;
	if (req.headers['if-none-match'] == GIT_RV+'_'+forcedETagUpdateCounter && !DEBUG) {
		res.writeHead(304);
		res.end();
		return;
	}
	genSession = true;
	if ('cookie' in req.headers) {
		var cookies = getCookies(req.headers.cookie);
		if ('SESSID' in cookies) {
			res.SESSID = cookies.SESSID;
			if (sessions[res.SESSID] === undefined || sessions[res.SESSID] === null) {
				sessions[res.SESSID] = { expires: Date.now() + (1000 * 60 * 60 * 24 * 90) };
			}
		}
		else {
			res.SESSID = genSessionID(req);
			sessions[res.SESSID] = { expires: Date.now() + (1000 * 60 * 60 * 24 * 90) };
		}
	}
	else {
		res.SESSID = genSessionID(req);
		sessions[res.SESSID] = { expires: Date.now() + (1000 * 60 * 60 * 24 * 90) };
	}

	var target, uri = url.parse(req.url, true);
	if (uri.pathname === '/') {
		/* Main page */
		httpHeaders(res, (target == serverError ? 500 : 200), 'text/html', true);
		res.end(index_cache.replace('\'%%%LOGGEDIN%%%\'', global.sessions[res.SESSID].refreshToken !== undefined));
	} else if (uri.pathname.match('/style/.*[.]css$') && fs.existsSync(uri.pathname.slice(1))) {
		/* Style sheets */
		httpHeaders(res, 200, 'text/css');
		target = uri.pathname.slice(1);
		fs.createReadStream(target).pipe(res);
	} else if (uri.pathname == '/script/belltimes.js' && !RELEASE) {
		fs.createReadStream('script/belltimes.concat.js').pipe(res);
	} else if (uri.pathname.match('/script/.*[.]js$') && fs.existsSync(uri.pathname.slice(1))) {
		/* JavaScript */
		httpHeaders(res, 200, 'application/javascript');
		target = uri.pathname.slice(1);
		fs.createReadStream(target).pipe(res);
	} else if (uri.pathname == '/api/belltimes') {
		/* Belltimes wrapper */
		httpHeaders(res, 200, 'application/json');
		getBelltimes(uri.query.date, res);
	} else if (uri.pathname == '/favicon.ico') {
		/* favicon */
		httpHeaders(res, 200, 'image/x-icon');
		fs.createReadStream('static/favicon.ico').pipe(res);
	} else if (uri.pathname == '/COPYING') {
		/* license */
		httpHeaders(res, 200, 'text/plain');
		fs.createReadStream('COPYING').pipe(res);
	} else if (uri.pathname.match('^/[.]ht.*')) {
		/* Disallow pattern */
		httpHeaders(res, 403, 'text/html');
		fs.createReadStream('static/403.html').pipe(res);
	} else if (uri.pathname == '/try_do_oauth') {
		/* OAuth2 attempt */
		auth.getAuthCode(res, res.SESSID);
	} else if (uri.pathname == '/login') {
		/* OAuth2 handler */
		auth.getAuthToken(res, uri, null);
	} else if (uri.pathname == '/session_debug' && DEBUG) {
		/* Session info */
		httpHeaders(res, 200, 'application/json');
		res.end(JSON.stringify(global.sessions[res.SESSID]));
	} else if (uri.pathname.match('/api/.*[.]json') && apis.isAPI(uri.pathname.slice(5))) {
		/* API calls */
		apis.get(uri.pathname.slice(5), uri.query, res.SESSID, function(obj) {
			httpHeaders(res, 200, 'application/json');
			res.end(JSON.stringify(obj));
		});
	} else if (uri.pathname == '/logout') {
		httpHeaders(res, 302, 'text/plain');
		//res.end('Redirecting...');
		delete global.sessions[res.SESSID].accessToken;
		delete global.sessions[res.SESSID].refreshToken;
		delete global.sessions[res.SESSID].accessTokenExpires;
		delete global.sessions[res.SESSID].refreshTokenExpires;
	} else if (uri.pathname == '/wat.html') {
		/* Landing page */
		httpHeaders(res, 200, 'text/html');
		fs.createReadStream('static/wat.html').pipe(res);
	} else if (uri.pathname == '/faq.html') {
		/* FAQs */
		httpHeaders(res, 200, 'text/html');
		fs.createReadStream('static/faq.html').pipe(res);
	} else if (uri.pathname == '/reset_access_token') {
		httpHeaders(res, 200, 'application/json');
		delete global.sessions[res.SESSID].accessToken;
		global.sessions[res.SESSID].accessTokenExpires = 0;
		res.end(JSON.stringify(global.sessions[res.SESSID]));
	} else if (uri.pathname == '/refresh_token') {
		httpHeaders(res, 200, 'application/json');
		if (global.sessions[res.SESSID].refreshToken) {
			auth.refreshAuthToken(global.sessions[res.SESSID].refreshToken, res.SESSID, function() {
				res.end(JSON.stringify(global.sessions[res.SESSID]));
			});
		} else {
			res.end('{"error": "not logged in"}');
		}
	} else if (uri.pathname == '/browserconfig.xml') {
		httpHeaders(res, 200, 'text/xml');
		fs.createReadStream('w8tile/browserconfig.xml').pipe(res);
	} else {
		/* 404 everything else */
		httpHeaders(res, 404, 'text/html');
		fs.createReadStream('static/404.html').pipe(res);
	}
	console.log('[' + this.name + ']', req.method, req.url, 'in', Date.now()-start + 'ms');
}

function requestSafeWrapper(req, res) {
	/*jshint validthis: true*/
	'use strict';
	try {
		onRequest.call(this, req, res);
	}
	catch (e) {
		console.log('ERROR HANDLING REQUEST: ' + req.url);
		console.log(e);
		console.log(e.stack);
		res.writeHead(500, 'text/html');
		serverError().pipe(res);
	}
}

function onListening() {
	/*jshint validthis: true*/
	'use strict';
	console.log('[' + this.name + '] Listening on http://' + this.address().address + ':' + this.address().port + '/');
}

function nxListening() {
	/*jshint validthis: true*/
	'use strict';
	console.log('[' + this.name + '] Listening on ' + this.path);
}
if (RELEASE) {
	console.log('[core] SBHS-Timetable-Node version ' + REL_RV + ' starting server...');
} else {
	console.log('[core] SBHS-Timetable-Node git revision ' + GIT_RV.substr(0,6) + ' starting server...');
}

var index_cache = serverError;

cache_index();

ipv4server = http.createServer();
ipv6server = http.createServer();
unixserver = http.createServer();

ipv4server.name = 'ipv4server';
ipv6server.name = 'ipv6server';
unixserver.name = 'unixserver';

ipv4server.on('request', requestSafeWrapper);
ipv6server.on('request', requestSafeWrapper);
unixserver.on('request', requestSafeWrapper);

ipv4server.on('listening', onListening);
ipv6server.on('listening', onListening);
unixserver.on('listening', nxListening);

ipv4server.listen(8080, '0.0.0.0');
setInterval(cleanSessions, 36000000); // clean expired sessions every hour

if (fs.existsSync('sessions.json')) {
	console.log('[core] Loading sessions...');
	global.sessions = JSON.parse(fs.readFileSync('sessions.json'));
	console.log('[core] Success!');
}
if (IPV6) {
	ipv6server.listen(8080, '::');
}
if (process.platform !== 'win32') {
	unixserver.path = '/tmp/timetable.sock';
	unixserver.listen(unixserver.path);
	fs.chmod(unixserver.path, '777');
}
