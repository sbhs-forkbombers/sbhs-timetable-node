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
/*globals sessions*/

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
	variables = require('./variables.js'),
	etag = require('./lib/etag.js'),
	uuid = require('node-uuid'),
	zlib = require('zlib');

/* Variables */
var HOLIDAYS = config.holidays,
	IPV6 = config.ipv6,
	NOHTTP = config.nohttp,
	RELEASE = variables.RELEASE,
	REL_RV = variables.REL_RV,
	DEBUG = variables.DEBUG,
	index_cache, ipv4, ipv6, socket;
global.sessions = {}; // global

if (!RELEASE) {
	/* Set GIT_RV to current Git revision */
	if (fs.existsSync('.git/refs/heads/master')) {
		var GIT_RV = fs.readFileSync('.git/refs/heads/master').toString().trim().substr(0,6);
	} else {
		var GIT_RV = REL_RV; // If the git revision can't be found (e.g. repo wasn't cloned) we use the git release version
	}
}
fs.writeFile('.reload', '0');

console.log('[core] Initialised in in ' + (Date.now() - all_start) + 'ms');

var jade_opts = {
	/* Jade compile options */
	pretty: DEBUG,
	compileDebug: DEBUG
};

function serverError() {
	/* Returns the 500 Internal Server Error page */
	'use strict';
	return (Math.random() < 0.9 ? fs.createReadStream('static/500.html') : fs.createReadStream('static/500.8.html'));
}

function compile_jade(path) {
	/* Compiles jade templates into HTML */
	'use strict';
	try {
		var mopts = jade_opts;
		mopts.filename = path;
		return jade.compile(fs.readFileSync(path), mopts);
	} catch (e) {
		console.error('[emerg] Failed to compile jade "'+path+'"!!! Stack trace:');
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
	index_cache = idx({title: '', holidays: HOLIDAYS});
	if (index_cache == serverError) {
		console.error('[emerg] Encountered an error while caching index page. Fix errors, and then hangup to reload.');
	}
	console.log('[core] Index page cached in ' + (Date.now() - jade_comp) + 'ms');
}

function cleanSessions() {
	/* Remove old (or otherwise) sessions from the store and save everything else to the filesystem */
	'use strict';
	var cleaned = 0;
	for (var i in global.sessions) {
		if (DEBUG) {
			console.log('[debug] Considering session for expiry. Length:',Object.keys(global.sessions[i]).length,' Expiry:',global.sessions[i].expires,'time left:',Math.floor((global.sessions[i].expires - Date.now())/1000), 'seconds');
		}
		if (global.sessions[i].expires < Date.now()) {
			delete global.sessions[i];
			cleaned++;
			if (DEBUG) {
				console.log('[debug] 10/10 would clean again');
			}
		} else if (Object.keys(global.sessions[i]).length < 2) { // not storing anything in the session, so it's just eating memory.
			delete global.sessions[i];
			cleaned++;
			if (DEBUG) {
			console.log('[debug] 11/10 would clean again');
			}
		} else if (DEBUG) {
			console.log('[debug] 0/10 would not recommend');
		}
	}
	console.log('[core] Cleaned ' + cleaned + ' sessions');
	fs.writeFileSync('sessions.json', JSON.stringify(global.sessions));
	console.log('[core] Wrote ' + Object.keys(global.sessions).length + ' sessions to disk');
}

function compressText(req, text, res, cb) {
	'use strict';
	if (typeof cb !== 'function') {
		return;
	}
	if ('accept-encoding' in req.headers) {
		var encs = req.headers['accept-encoding'].replace(/q=\d\.\d/, '').split(/, ?/);
		if (encs.indexOf('gzip') != -1) {
			if (DEBUG) {
				console.log('[compress] using gzip compression');
			}
			res.setHeader('Content-Encoding', 'gzip');
			zlib.gzip(text, cb);
			return;
		}
		else if (encs.indexOf('deflate') != -1) {
			if (DEBUG) {
				console.log('[compress] using deflate compression');
			}
			res.setHeader('Content-Encoding', 'deflate');
			zlib.deflate(text, cb);
			return;
		}
	}
	cb(text);
}

function pipeCompress(req, file, res) {
	'use strict';
	var result = fs.createReadStream(file);
	if ('accept-encoding' in req.headers) {
		var encs = req.headers['accept-encoding'].replace(/q=\d\.\d/, '').split(/, ?/);
		if (encs.indexOf('gzip') != -1) {
			console.log('[compress] using gzip compression');
			res.setHeader('Content-Encoding', 'gzip');
			result = result.pipe(zlib.createGzip());
		}
		else if (encs.indexOf('deflate') != -1) {
			console.log('[compress] using deflate compression');
			res.setHeader('Content-Encoding', 'deflate');
			result = result.pipe(zlib.createDeflate());
		}
	}
	return result;
}

process.on('SIGHUP', function() {
	/* Clean and re-cache if we receive a hangup */
	'use strict';
	cache_index();
	cleanSessions();
});

process.on('SIGINT', function() {
	/* Close the sockets and save sessions when we receive an interrupt */
	'use strict';
	socket.close(function() { global.socketDone = true; });
	if (!NOHTTP) {
		ipv4.close(function() { global.ipv4Done = true; });
		ipv6.close(function() { global.ipv6Done = true; });
	}
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
	if (dynamic /*|| DEBUG*/) { // disable caching
		headers['Cache-Control'] = 'no-cache, must-revalidate';
		headers.Pragma = 'no-cache';
		headers.Expires = 'Sat, 26 Jul 1997 05:00:00 GMT';
	} else if (!dynamic) {
		/*date = new Date();
		date.setYear(date.getFullYear() + 1);
		headers.Expires = date.toGMTString();*/
	}

	if (tag !== null && tag !== undefined) {
		headers.ETag = tag;
	}
	headers['Content-Type'] = contentType + '; charset=UTF-8';
	headers['X-Powered-By'] = 'Node.js ' + process.version;
	res.writeHead(response, headers);
	return res;
}

function genSessionID() {
	/* Generate a random session ID */
	'use strict';
	return uuid.v4();
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
		} else if (reqHash !== hash) {
			changed(hash);
		} else {
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
		} else {
			unchanged(hash);
		}
	});
}

function onRequest(req, res) {
	/* Respond to requests */
	/* jshint validthis: true */
	'use strict';
	var start = Date.now(),
		contentType = 'text/html',
		filePath = 'static/404.html';
	var changed = function(hash) {
		var pipe = pipeCompress(req, filePath, res);
		httpHeaders(res, 200, contentType, false, hash);
		pipe.pipe(res);
	};
	var dynChanged = function(hash) {
		compressText(req, target, res, function(a,r) {
			if (a) {
				res.setHeader('Content-Encoding', '');
				r = target;
			}
			httpHeaders(res, 200, contentType, false, hash);
			res.end(r);
		});
	};
	var unchanged = function() {
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
		} else {
			res.SESSID = genSessionID();
			sessions[res.SESSID] = { expires: Date.now() + (1000 * 60 * 60 * 24 * 90) };
		}
	} else {
		res.SESSID = genSessionID();
		sessions[res.SESSID] = { expires: Date.now() + (1000 * 60 * 60 * 24 * 90) };
	}

	var target, uri = url.parse(req.url, true);
	uri.pathname = uri.pathname.replace('/../', '/'); // hahaha NO
	/* Response block */
	if (uri.pathname === '/') {
		/* Main page */
		// TODO cache two different versions of index for logged-in and not logged in.
		target = index_cache;
		if (typeof target !== 'string') {
			httpHeaders(res, 500, 'text/html', true);
			target().pipe(res);
		} else {
			contentType = 'text/html';
			target = target.replace('\'%%%LOGGEDIN%%%\'', global.sessions[res.SESSID].refreshToken !== undefined);
			checkText(target, req, unchanged, dynChanged);
		}
		//httpHeaders(res, (target == serverError ? 500 : 200), 'text/html', true);
		//res.end(index_cache.replace('\'%%%LOGGEDIN%%%\'', global.sessions[res.SESSID].refreshToken !== undefined));
	} else if (uri.pathname.match('.*config[.]js.*') && fs.existsSync('config_sample.js')) {
		httpHeaders(res, 403, 'text/plain');
		fs.createReadStream('config_sample.js').pipe(res);
	} else if (uri.pathname.match('/style/.*[.]css$') && fs.existsSync(uri.pathname.slice(1))) {
		/* Style sheets */
		contentType = 'text/css';
		filePath = uri.pathname.slice(1);
		checkFile(filePath, req, unchanged, changed);
	} else if (uri.pathname.match('/script/.*[.]js$') && fs.existsSync(uri.pathname.slice(1))) {
		/* JavaScript */
		contentType = 'application/javascript';
		filePath = uri.pathname.slice(1);
		checkFile(filePath, req, unchanged, changed);
	} else if (uri.pathname == '/api/belltimes') {
		/* Belltimes wrapper */
		apis.get('belltimes', uri.query, res.SESSID, function(obj) {
			if (obj.etag == req.headers['if-none-match']) {
				res.writeHead(304);
				res.end();
				return;
			}
			httpHeaders(res, 200, 'application/json', true, obj.etag);
			res.end(obj.json);
		});
	} else if (uri.pathname.match('/static/.*[.]jpg|jpeg$') && fs.existsSync(uri.pathname.slice(1))) {
		/* jpegs */
		contentType = 'image/jpeg';
		filePath = uri.pathname.slice(1);
		checkFile(filePath, req, unchanged, changed);
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
		if ('app' in uri.query) {
			sessions[res.SESSID].nord = true;
			console.log('Won\'t redirect...');
		}
		auth.getAuthCode(res, res.SESSID);
	} else if (uri.pathname == '/login') {
		/* OAuth2 handler */
		console.log(require('util').inspect(sessions[res.SESSID]));
		if (sessions[res.SESSID].nord) {
			console.log('Sending to /mobile_loading!');
			auth.getAuthToken(res, uri, function() {
				httpHeaders(res, 302, '', true, null, { 'Location': '/mobile_loading?sessionID='+encodeURIComponent(res.SESSID) });
				res.end();
				//httpHeaders(res, 200, 'application/json', true);
				//res.end(JSON.stringify(global.sessions[res.SESSID]));
			}, false);
		}
		else {
			auth.getAuthToken(res, uri, null, true);
		}
	} else if (uri.pathname == '/mobile_loading') {
		httpHeaders(res, 200, 'text/html', true, null);
		fs.createReadStream('static/appLoading.html').pipe(res);
	} else if (uri.pathname == '/session_debug' && DEBUG) {
		/* Session info */
		httpHeaders(res, 200, 'application/json', true);
		var obj = {};
		obj[res.SESSID] = global.sessions[res.SESSID];
		res.end(JSON.stringify(obj));
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
	} else if (uri.pathname == '/main.appcache') {
		filePath = 'static/app.appcache';
		contentType = 'text/cache-manifest';
		//checkFile(filePath, req, unchanged, changed);
		httpHeaders(res, 200, contentType, true, null, {'Last-Modified': new Date().toGMTString() });
		fs.createReadStream(filePath).pipe(res);
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
	} catch (e) {
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

function onUnixListening() {
	/* Listen for Unix sockets */
	/* jshint validthis: true */
	'use strict';
	console.log('[' + this.name + '] Listening on ' + this.path);
}

/* Startup message */
if (RELEASE) {
	console.log('[core] SBHS-Timetable-Node version ' + REL_RV + ' starting server...');
} else {
	console.log('[core] SBHS-Timetable-Node revision ' + GIT_RV + ' starting server...');
}

/* index_cache defaults to 500, cache the index page */
index_cache = serverError;
cache_index();

/* Start HTTP servers. */
/* NOHTTP defines that no HTTP servers will be started. You will need a program that can forward requests to the Unix socket. */
if (!NOHTTP) {
	/* Start the IPv4 server */
	ipv4 = http.createServer();
	ipv4.name = 'ipv4';
	ipv4.on('request', requestSafeWrapper);
	ipv4.on('listening', onListening);
	ipv4.listen(8080, '0.0.0.0');

	/* Start the IPv6 server if it is enabled */
	if (IPV6) {
		ipv6 = http.createServer();
		ipv6.name = 'ipv6';
		ipv6.on('request', requestSafeWrapper);
		ipv6.on('listening', onListening);
		ipv6.listen(8080, '::');
	}
}

/* Start the server on a Unix socket if we aren't running on Windows */
/* All values for process.platform as of Node.js v0.10.29 support Unix sockets except Windows */
if (process.platform !== 'win32') {
	socket = http.createServer();
	socket.name = 'socket';
	socket.on('request', requestSafeWrapper);
	socket.on('listening', onUnixListening);
	socket.path = '/tmp/sbhstimetable.socket';
	socket.listen(socket.path);
	fs.chmod(socket.path, '777');
} else if (NOHTTP) {
	console.warn('[warn] NOHTTP is true, but host platform is Windows! App cannot be accessed in any way!');
}

setInterval(cleanSessions, 900000); // clean expired sessions every 15 minutes

if (fs.existsSync('sessions.json')) {
	console.log('[core] Loading sessions...');
	try {
		global.sessions = JSON.parse(fs.readFileSync('sessions.json'));
		console.log('[core] Success!');
	} catch (e) {
		console.warn('[warn] Failed to load sessions.json:', e);
	}
}
