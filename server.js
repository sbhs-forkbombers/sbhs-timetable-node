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
/*globals SPDY, HTTPS, HTTP2, IPV6, DEBUG, RELEASE, GIT_RV, REL_RV, NOHTTP, sessions*/
/* jslint -W098, -W020 */
var all_start = Date.now();
console.log('[core] Loading...');
/* Requires */
var http = require('http'),
	fs = require('fs'),
	jade = require('jade'),
	url = require('url'),
	auth = require('./lib/auth.js'),
	apis = require('./lib/api.js'),
	config = require('./config.js'),
	etag = require('./lib/etag.js'),
	request = require('request');

if (SPDY) {
	var https = require('spdy');
} else if (HTTPS) {
	var https = require('https');
}

if (HTTP2) {
	var http2 = require('http2');
}

/* Variables */
var secret = config.secret,
	clientID = config.clientID,
	redirectURI = config.redirectURI,
	privateKeyFile = config.privateKeyFile,
	certificateFile = config.certificateFile,
	forcedETagUpdateCounter = 0,
	cachedBells = {},
	index_cache, ipv4server, ipv6server, unixserver, i4tlsserver, i6tlsserver, i4h2server, i6h2server;
sessions = {}; // global

/* SSL/TLS */
if (SPDY || HTTP2) {
	var options = {
		key: fs.readFileSync(privateKeyFile),
		cert: fs.readFileSync(certificateFile)
	};
}

console.log('[core] Initialised in in ' + (Date.now() - all_start) + 'ms');

require('./variables.js'); // set globals appropriate to status - dev (DEBUG = true) or release (DEBUG = false and GIT_RV set)
if (!RELEASE) {
	/* Set GIT_RV to current Git revision */
	GIT_RV = fs.readFileSync('.git/refs/heads/master').toString().trim();
	var watcher = fs.watch('.git/refs/heads/master', { persistent: false }, function() {
		'use strict';
		GIT_RV = fs.readFileSync('.git/refs/heads/master').toString().trim();
	});
}
fs.writeFile('.reload', '0');

var jade_opts = {
	/* Jade compile options */
	pretty: DEBUG,
	compileDebug: DEBUG
};

function serverError() {
	/* Returns the 500 Internal Server Error page */
	'use strict';
	return (Math.random() < 0.5 ? fs.createReadStream('static/500.html') : fs.createReadStream('static/500.8.html'));
}

function compile_jade(path) {
	/* Compiles jade templates into HTML */
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
	/* Compile and cache the index page */
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
	/* Remove old (or otherwise) sessions from the store and save everything else to the filesystem */
	'use strict';
	var start = Date.now(),
		cleaned = 0;
	for (var i in global.sessions) {
		console.log('[debug] Considering session for expiry. Length:',Object.keys(global.sessions[i]).length,' Expiry:',global.sessions[i].expires,'time left:',Math.floor((global.sessions[i].expires - Date.now())/1000), 'seconds');
		if (global.sessions[i].expires < Date.now()) {
			delete global.sessions[i];
			cleaned++;
			console.log('[debug] 10/10 would clean again');
		}
		else if (Object.keys(global.sessions[i]).length < 2) { // not storing anything in the session, so it's just eating memory.
			delete global.sessions[i];
			cleaned++;
			console.log('[debug] 10/10 would clean again');
		}
		else {
			console.log('[debug] 0/10 would not recommend');
		}
	}
	console.log('[core] Cleaned ' + cleaned + ' sessions');
	fs.writeFileSync('sessions.json', JSON.stringify(global.sessions));
	console.log('[core] Wrote ' + Object.keys(global.sessions).length + ' sessions to disk');
}

var reloadWatcher = fs.watch('.reload', { persistent: false }, function() {
	/* Clean and re-cache when file modification is detected */
	'use strict';
	cache_index();
	cleanSessions();
});

process.on('SIGHUP', function() {
	/* Clean and re-cache if we receive a hangup */
	'use strict';
	cache_index();
	cleanSessions();
});

process.on('SIGINT', function() {
	/* Close the sockets and save sessions when we receive an interrupt */
	'use strict';
	unixserver.close(function() { global.unixDone = true; });
	ipv4server.close(function() { global.ipv4Done = true; });
	ipv6server.close(function() { global.ipv6Done = true; });
	fs.writeFileSync('sessions.json', JSON.stringify(global.sessions));
	console.log('Saved sessions.');
});


function httpHeaders(res, response, contentType, dynamic, tag, headers) {
	/* Generate HTTP headers, including the response code, content type and any other headers */
	'use strict';
	var date;
	dynamic = dynamic || false;
	headers = headers || {};
	if (!('Set-Cookie' in headers) && 'SESSID' in res) {
		headers['Set-Cookie'] = 'SESSID='+res.SESSID+'; Max-Age=36000';
	}
	if (dynamic || DEBUG) { // disable caching
		headers['Cache-Control'] = 'no-cache, must-revalidate';
		headers.Pragma = 'no-cache';
		headers.Expires = 'Sat, 26 Jul 1997 05:00:00 GMT';
	} else if (!dynamic) {
		date = new Date();
		date.setYear(date.getFullYear() + 1);
		headers.Expires = date.toGMTString();
	}

	if (tag !== null && tag !== undefined) {
		headers.ETag = tag;
	}
	headers['Content-Type'] = contentType + '; charset=UTF-8';
	headers['X-Powered-By'] = 'NodeJS ' + process.version +'; PHP v5.4.3';
	headers.Server = 'IIS; version 7.5; nginx; version 10.2.8; Mongrel; eHTTP; version 6.4; Fedora; Ubuntu; Debian';
	res.writeHead(response, headers);
	return res;
}

function getBelltimes(date, res, req) {
	/* Get the belltimes from API and cache them */
	'use strict';
	if (typeof date !== 'string' || !/\d\d\d\d-\d?\d-\d?\d/.test(date)) {
		httpHeaders(res, 200, 'application/json', true);
		res.end(JSON.stringify({error: 'Invalid Date!'}));
	}
	date = date.replace('-0', '-');
	if (date in cachedBells) {
		if ('if-none-match' in req.headers) {
			if (req.headers['if-none-match'] === cachedBells[date].hash) {
				res.writeHead(304);
				res.end();
				return;
			}
		}
		httpHeaders(res, 200, 'application/json', true, cachedBells[date].hash);
		res.end(cachedBells[date].json);
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
				cachedBells[date] = { 'json': b, 'hash': etag.syncText(b) };
				httpHeaders(res, 200, 'application/json', true, cachedBells[date].hash);
				res.end(b);
			}
		);
	}
}

function genSessionID(req) {
	/* Generate a random session ID */
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

function checkFile(file, req, unchanged, changed) {
	'use strict';
	var reqHash = '';
	if ('if-none-match' in req.headers) {
		reqHash = req.headers['if-none-match'];
	}
	etag.file(file, function(err, hash) {
		if (err !== null) {
			changed(null); // meh
		}
		else if (reqHash !== hash) {
			changed(hash);
		}
		else {
			unchanged(hash);
		}
	});
}

function checkText(text, req, unchanged, changed) {
	'use strict';
	var reqHash = '';
	if ('if-none-match' in req.headers) {
		reqHash = req.headers['if-none-match'];
	}
	etag.text(text, function(hash) {
		if (reqHash !== hash) {
			changed(hash);
		}
		else {
			unchanged(hash);
		}
	});
}

function onRequest(req, res) {
	/* Respond to requests */
	/* jshint validthis: true */
	'use strict';
	var start = Date.now(),
		contentType = 'text/plain',
		filePath = 'static/404.html';
	var changed = function(hash) {
		httpHeaders(res, 200, contentType, false, hash);
		fs.createReadStream(filePath).pipe(res);
	};
	var dynChanged = function(hash) {
		httpHeaders(res, 200, contentType, true, hash);
		res.end(target);
	};
	var unchanged = function(hash) {
		res.writeHead(304);
		res.end();
	};
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

	/* Response block */
	if (uri.pathname === '/') {
		/* Main page */
		// TODO cache two different versions of index for logged-in and not logged in.
		target = index_cache;
		if (typeof target === 'function') {
			httpHeaders(res, 500, 'text/html', true);
			target().pipe(res);
		}
		else {
			contentType = 'text/html';
			target = target.replace('\'%%%LOGGEDIN%%%\'', global.sessions[res.SESSID].refreshToken !== undefined);
			checkText(target, req, unchanged, dynChanged);
		}
		//httpHeaders(res, (target == serverError ? 500 : 200), 'text/html', true);
		//res.end(index_cache.replace('\'%%%LOGGEDIN%%%\'', global.sessions[res.SESSID].refreshToken !== undefined));
	} else if (uri.pathname.match('/style/.*[.]css$') && fs.existsSync(uri.pathname.slice(1))) {
		/* Style sheets */
		contentType = 'text/css';
		filePath = uri.pathname.slice(1);
		checkFile(filePath, req, unchanged, changed);
	} else if (uri.pathname.match('/script/.*[.]js$') && fs.existsSync(uri.pathname.slice(1))) {
		/* JavaScript */
		filePath = uri.pathname.slice(1);
		contentType = 'application/javascript';
		checkFile(filePath, req, unchanged, changed);
	} else if (uri.pathname == '/api/belltimes') {
		/* Belltimes wrapper */
		httpHeaders(res, 200, 'application/json', true);
		getBelltimes(uri.query.date, res, req);
	} else if (uri.pathname == '/favicon.ico') {
		/* favicon */
		contentType = 'image/x-icon';
		filePath = 'static/favicon.ico';
		checkFile(filePath, req, unchanged, changed);
	} else if (uri.pathname == '/static/icon-hires.png') {
		/* hires icon */
		contentType = 'image/png';
		filePath = 'static/icon-hires.png';
		checkFile(filePath, req, unchanged, changed);
	} else if (uri.pathname == '/COPYING') {
		/* license */
		contentType = 'text/plain';
		filePath = 'COPYING';
		checkFile(filePath, req, unchanged, changed);
	} else if (uri.pathname.match('^/[.]ht.*')) {
		/* Disallow pattern */
		httpHeaders(res, 403, 'text/html');
		fs.createReadStream('static/403.html').pipe(res);
	} else if (uri.pathname == '/try_do_oauth') {
		/* OAuth2 attempt */
		auth.getAuthCode(res, res.SESSID);
	} else if (uri.pathname == '/login') {
		/* OAuth2 handler */
		auth.getAuthToken(res, uri, null, true);
	} else if (uri.pathname == '/session_debug' && DEBUG) {
		/* Session info */
		httpHeaders(res, 200, 'application/json', true);
		res.end(JSON.stringify(global.sessions[res.SESSID]));
	} else if (uri.pathname.match('/api/.*[.]json') && apis.isAPI(uri.pathname.slice(5))) {
		/* API calls */
		apis.get(uri.pathname.slice(5), uri.query, res.SESSID, function(obj) {
			contentType = 'application/json';
			target = JSON.stringify(obj);
			checkText(target, req, unchanged, dynChanged);
		});
	} else if (uri.pathname == '/logout') {
		/* Log out */
		httpHeaders(res, 302, 'text/plain', true, null, { 'Location': '/' });
		res.end('Redirecting...');
		delete global.sessions[res.SESSID].accessToken;
		delete global.sessions[res.SESSID].refreshToken;
		delete global.sessions[res.SESSID].accessTokenExpires;
		delete global.sessions[res.SESSID].refreshTokenExpires;
	} else if (uri.pathname == '/wat.html') {
		/* Landing page */
		filePath = 'static/wat.html';
		contentType = 'text/html';
		checkFile(filePath, req, unchanged, changed);
	} else if (uri.pathname == '/faq.html') {
		/* FAQs */
		filePath = 'static/faq.html';
		contentType = 'text/html';
		checkFile(filePath, req, unchanged, changed);
	} else if (uri.pathname == '/reset_access_token') {
		/* Reset access token */
		httpHeaders(res, 200, 'application/json', true);
		delete global.sessions[res.SESSID].accessToken;
		global.sessions[res.SESSID].accessTokenExpires = 0;
		res.end(JSON.stringify(global.sessions[res.SESSID]));
	} else if (uri.pathname == '/refresh_token') {
		/* Refresh access token */
		httpHeaders(res, 200, 'application/json', true);
		if (global.sessions[res.SESSID].refreshToken) {
			auth.refreshAuthToken(global.sessions[res.SESSID].refreshToken, res.SESSID, function() {
				res.end(JSON.stringify(global.sessions[res.SESSID]));
			});
		} else {
			res.end('{"error": "not logged in"}');
		}
	} else if (uri.pathname == '/browserconfig.xml') {
		/* Windows thingies, ignore this */
		filePath = 'w8tile/browserconfig.xml';
		contentType = 'text/xml';
		checkFile(filePath, req, unchanged, changed);
	} else if (uri.pathname == '/win8') {
		/* STOP error :( */
		httpHeaders(res, 500, 'text/html');
		fs.createReadStream('static/500.8.html').pipe(res);
	} else if (uri.pathname == '/EFLAT' && DEBUG) {
		/* Force a 500 error (out of tune) */
		httpHeaders(res, 500, 'text/html');
		serverError().pipe(res);
	} else if (uri.pathname.match('/octicons/.*') && fs.existsSync(uri.pathname.slice(1))) {
		contentType = 'application/x-octet-stream';
		if (uri.pathname.substr(-4) == '.css') {
			contentType = 'text/css';
		}
		else if (uri.pathname.substr(-5) == '.woff') {
			contentType = 'application/font-woff';
		}
		else if (uri.pathname.substr(-4) == '.txt') {
			contentType = 'text/plain';
		}
		filePath = uri.pathname.slice(1);
		checkFile(filePath, req, unchanged, changed);
	} else {
		/* 404 everything else */
		httpHeaders(res, 404, 'text/html');
		fs.createReadStream('static/404.html').pipe(res);
	}
	console.log('[' + this.name + ']', req.method, req.url, 'in', Date.now()-start + 'ms');
}

function requestSafeWrapper(req, res) {
	/* Wrapper to return 500 if bad things happen */
	/* jshint validthis: true */
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
	/* Listen for TCP sockets */
	/* jshint validthis: true */
	'use strict';
	console.log('[' + this.name + '] Listening on http://' + this.address().address + ':' + this.address().port + '/');
}

function nxListening() {
	/* Listen for Unix sockets */
	/* jshint validthis: true */
	'use strict';
	console.log('[' + this.name + '] Listening on ' + this.path);
}

/* Startup message */
if (RELEASE) {
	console.log('[core] SBHS-Timetable-Node version ' + REL_RV + ' starting server...');
} else {
	console.log('[core] SBHS-Timetable-Node git revision ' + GIT_RV.substr(0,6) + ' starting server...');
}

/* index_cache defaults to 500, cache the index page */
var index_cache = serverError;
cache_index();

/* Start HTTP servers. */
/* NOHTTP defines that no HTTP servers will be started. You will need a program that can forward requests to the Unix socket. */
if (!NOHTTP) {
	/* Start the IPv4 server */
	ipv4server = http.createServer();
	ipv4server.name = 'ipv4server';
	ipv4server.on('request', requestSafeWrapper);
	ipv4server.on('listening', onListening);
	ipv4server.listen(8080, '0.0.0.0');

	/* Start the IPv6 server if it is enabled */
	if (IPV6) {
		ipv6server = http.createServer();
		ipv6server.name = 'ipv6server';
		ipv6server.on('request', requestSafeWrapper);
		ipv6server.on('listening', onListening);
		ipv6server.listen(8080, '::');
	}

	/* TLS servers */
	if (SPDY || HTTPS) {
		/* Start the IPv4 TLS/SPDY server */
		i4tlsserver = https.createServer(options);
		i4tlsserver.name = 'tlsipv4server';
		i4tlsserver.on('request', requestSafeWrapper);
		i4tlsserver.on('listening', onListening);
		i4tlsserver.listen(4430, '0.0.0.0');

		/* Start the IPv6 TLS/SPDY server if it is enabled */
		if (IPV6) {
			i6tlsserver = https.createServer(options);
			i6tlsserver.name = 'tlsipv6server';
			i6tlsserver.on('request', requestSafeWrapper);
			i6tlsserver.on('listening', onListening);
			i6tlsserver.listen(4430, '::');
		}
	}

	/* HTTP/2.0 servers */
	if (HTTP2) {
		/* Start the IPv4 HTTP/2.0 server */
		i4h2server = http2.createServer(options);
		i4h2server.name = 'http2ipv4server';
		i4h2server.on('request', requestSafeWrapper);
		i4h2server.on('listening', onListening);
		i4h2server.listen(4432, '0.0.0.0');

		/* Start the IPv6 HTTP/2.0 server if it is enabled */
		if (IPV6) {
			i6h2server = http2.createServer(options);
			i6h2server.name = 'http2ipv6server';
			i6h2server.on('request', requestSafeWrapper);
			i6h2server.on('listening', onListening);
			i6h2server.listen(4432, '::');
		}
	}
}

/* Start the server on a Unix socket if we aren't running on Windows */
/* All values for process.platform as of Node.js v0.10.28 support Unix sockets except Windows */
if (process.platform !== 'win32') {
	unixserver = http.createServer();
	unixserver.name = 'unixserver';
	unixserver.on('request', requestSafeWrapper);
	unixserver.on('listening', nxListening);
	unixserver.path = '/tmp/timetable.sock';
	unixserver.listen(unixserver.path);
	fs.chmod(unixserver.path, '777');
}

setInterval(cleanSessions, 900000); // clean expired sessions every 15 minutes

if (fs.existsSync('sessions.json')) {
	console.log('[core] Loading sessions...');
	try {
		global.sessions = JSON.parse(fs.readFileSync('sessions.json'));
		console.log('[core] Success!');
	}
	catch (e) {
		console.error('[core] Failed to load sessions.json:', e);
	}
}
