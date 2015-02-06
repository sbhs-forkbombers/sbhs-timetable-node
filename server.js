/* SBHS-Timetable-Node: Countdown and timetable all at once (NodeJS app).
 * Copyright (C) 2014-2015 James Ye, Simon Shields
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
/* globals sessions */
require('./lib/es6.js');
process.env.TZ = 'Australia/Sydney';
var all_start = Date.now();
console.log('[core] Loading...');
/* Requires */
var fs = require('fs'),
	http = require('http'),
	jade = require('jade'),
	url = require('url'),
	zlib = require('zlib'),
	less = require('less'),
	minify = require('html-minifier').minify,
	apis = require('./lib/api.js'),
	auth = require('./lib/auth.js'),
	etag = require('./lib/etag.js'),
	config = require('./config.js'),
	variables = require('./variables.js'),
	schoolday = require('./lib/schoolday.js'),
	files = require('./lib/files.js');
	colours = require('./lib/colours.js');

/* Variables */
var	IPV6 = config.ipv6,
	NOHTTP = config.nohttp,
	SOCKET = config.socket,
	IPV4_IP = config.ipv4_ip,
	IPV6_IP = config.ipv6_ip,
	PORT = config.port,
	lessParser = new less.Parser(),
	hmopts = { removeComments: true, removeCommentsFromCDATA: true, collapseWhitespace: true },
	index_cache, timetable_cache, ipv4, ipv6, socket;

/* Globals */
global.RELEASE = variables.RELEASE;
global.MINIFY = variables.MINIFY;
global.REL_RV = variables.REL_RV;
global.DEBUG = variables.DEBUG;

if (process.platform == 'win32') {
	SOCKET = false; // Here's a nickel, kid. Get yourself a better OS.
}

if (!RELEASE) {
	/* Set GIT_RV to current Git revision */
	if (fs.existsSync('.git/refs/heads/master')) {
		var GIT_RV = fs.readFileSync('.git/refs/heads/master').toString().trim().substr(0,6);
		var NO_GIT = false;
	} else {
		var NO_GIT = true; // If the git revision can't be found (e.g. repo wasn't cloned) we use the git release version
	}
}

fs.writeFile('.reload', '0');

console.log('[core] Initialised in in ' + (Date.now() - all_start) + 'ms');

var jade_opts = {
	/* Jade compile options */
	pretty: DEBUG,
	compileDebug: DEBUG
};


function compile_jade(path) {
	/* Compiles jade templates into HTML */
	'use strict';
	try {
		var mopts = jade_opts;
		mopts.filename = path;
		return jade.compile(fs.readFileSync(path), mopts);
	} catch (e) {
		console.error('[core_emerg] Failed to compile jade "'+path+'"!!! Stack trace:');
		console.error(e.stack);
		return null;
	}
}

function compile_less(path, colour, callback) {
	/* Compiles less templates into CSS */
	'use strict';
	lessParser.parse(fs.readFileSync(path, { encoding: 'utf8' }), function(e, tree) {
		if (e) {
			callback(500,'text/html', serverError());
			console.error('[core_emerg] Failed to compile less ' + path + ' (colour: ' + colour + ')');
			console.error(e);
		}
		else {
			callback(200, 'text/css', tree.toCSS({ compress: MINIFY }));
		}
	}, {
		modifyVars: colour
	});
}

function cache_index() {
	/* Compile and cache the index page */
	'use strict';
	console.log('[core] Caching index/timetable pages... (hangup to re-cache)');
	var jade_comp = Date.now();
	index_cache = compile_jade('dynamic/index.jade');
	if (index_cache === null) {
		console.error('[core_emerg] Encountered an error while caching index page. Fix errors, and then hangup to reload.');
	}
	timetable_cache = compile_jade('dynamic/timetable.jade');
	if (timetable_cache === null) {
		console.error('[core_emerg] Encountered an error while caching timetable page. Fix errors, and then hangup to reload.');
	}
	console.log('[core] Index and Timetable pages cached in ' + (Date.now() - jade_comp) + 'ms');
}



function exit() {
}

process.on('SIGHUP', function() {
	/* Clean and re-cache if we receive SIGHUP */
	'use strict';
	cache_index();
	session.clearSessions();
});

process.on('SIGINT', function() {
	/* Close sockets and save sessions */
	'use strict';
	console.log('[core] Got SIGINT');
	if (SOCKET) {
		socket.close(function() { global.socketDone = true; });
		if (fs.existsSync('/tmp/sbhstimetable.socket')) {
			fs.unlinkSync('/tmp/sbhstimetable.socket');
		}
	}
	if (!NOHTTP) {
		ipv4.close(function() { global.ipv4Done = true; });
		if (IPV6) {
			ipv6.close(function() { global.ipv6Done = true; });
		}
	}
	sessions.saveSessionsSync();
	console.log('[core] Saved sessions');
	console.log('[core] Exiting');
	process.exit(0);
});

process.on('SIGTERM', function() {
	/* Close sockets and save sessions */
	'use strict';
	console.log('[core] Got SIGTERM');
	if (SOCKET) {
		socket.close(function() { global.socketDone = true; });
		if (fs.existsSync('/tmp/sbhstimetable.socket')) {
			fs.unlinkSync('/tmp/sbhstimetable.socket');
		}
	}
	if (!NOHTTP) {
		ipv4.close(function() { global.ipv4Done = true; });
		if (IPV6) {
			ipv6.close(function() { global.ipv6Done = true; });
		}
	}
	session.saveSessionsSync();
	console.log('[core] Saved sessions');
	console.log('[core] Exiting');
	process.exit(0);
});

function onRequest(req, res) {
	/* Respond to requests */
	/* jshint validthis: true */
	'use strict';
	var start = Date.now(),
	contentType = 'text/html',
	filePath = 'static/404.html',
	that = this;
	res.on('finish', function() {
		console.log('[' + that.name + ']', req.method, req.url, '-', res.statusCode, 'in', Date.now()-start + 'ms - ' + req.headers['user-agent']);
	});

	var sessID = session.getSession(req.headers.cookies);
	if (sessID === null) {
		sessID = session.createSession();
		// set the cookie when we generate a new session.
		res.setHeader('Set-Cookie', 'SESSID='+sessID+'; Path=/; Expires=' + new Date(Date.now() + 60*60*24*90*1000));
	}
	var data = sessions.getSessionData(sessID);
	res.SESSID = sessID; // TODO kill res.SESSID dead

	var target, uri = url.parse(req.url, true);
	/* Response block */
	if (uri.pathname === '/') { // TODO cache two different versions of index for logged-in and not logged in.
		/* Main page */
		var scheme = {};
		delete uri.query.colour;
		if ('colour' in uri.query || 'invert' in uri.query) {
			if (!('colour' in uri.query)) {
				uri.query.colour = 'default';
			}
			scheme = colours.get(uri.query.colour, false);
		} else {
			scheme = colours.getFromUriQuery(uri.query);
		}

		var isHoliday = (global.HOLIDAYS || 'holiday' in uri.query) && !(config.disableHoliday || 'noholiday' in uri.query);
		if ('invert' in uri.query) {
			var tmp = scheme.highBg;
			scheme.highBg = scheme.highFg;
			scheme.highFg = tmp;
			tmp = scheme.bg;
			scheme.bg = scheme.fg;
			scheme.fg = tmp;
		}
		if (typeof index_cache !== 'function') {
			files.err500();
		} else {
			compile_less('style/index.less', scheme, function(code, type, less) {
				target = index_cache({
					title: '',
					holidays: isHoliday,
					holEnd: schoolday.getHolidaysFinished(),
					loggedIn: data.refreshToken !== undefined,
					reallyInHolidays: schoolday.actualHolidaysFinished(),
					grooveOverride: 'groove' in uri.query,
					testing: 'testing' in uri.query,
					query: '?colour='+uri.query.colour,
					inverted: 'invert' in uri.query,
					colour: uri.query.colour,
					css: less,
					cscheme: scheme
				});
				if (MINIFY) {
					target = minify(target, hmopts);
				}
				files.contentType('text/html', res);
				files.respondText(target, req, res);
			});
		}
		//httpHeaders(res, req, (target == serverError ? 500 : 200), 'text/html', true);
		//res.end(index_cache.replace('\'%%%LOGGEDIN%%%\'', global.sessions[res.SESSID].refreshToken !== undefined));
	} else if (uri.pathname === '/timetable') {
		var loggedIn = 'refreshToken' in global.sessions[res.SESSID];
		if (loggedIn) {
			apis.get('bettertimetable.json', {}, res.SESSID, function(obj) {
				target = timetable_cache({'loggedIn': loggedIn, 'timetable': obj});
				if (MINIFY) {
					target = minify(target, hmopts);
				}
				res.setHeader('Content-Type', 'text/html');
				files.respondText(target, req, res);
			});
		} else {
			target = timetable_cache({'loggedIn': loggedIn});
			if (MINIFY) {
				target = minify(target, hmopts);
			}
			res.setHeader('Content-Type', 'text/html');
			files.respondText(target, req, res);
		}
	} else if (uri.pathname.match('.*config[.]js.*') && fs.existsSync('config_sample.js')) {
		files.setContentType('text/plain', res);
		files.fileHeaders(res);
		fs.createReadStream('config_sample.js').pipe(res);
	} else if (uri.pathname.match('/style/.*[.]css$') /*&& fs.existsSync(uri.pathname.slice(1))*/) {
		/* Style sheets */
		filePath = uri.pathname.slice(1);
		files.respondFile(filePath, req, res);
	} else if (uri.pathname.match('/style/.*[.]less$') && fs.existsSync(uri.pathname.slice(1))) {
		/* Less style sheets */
		compile_less(uri.pathname.slice(1), colours.get(uri.query.colour, 'invert' in uri.query), function(rescode, type, css) {
			if (type === 'text/html') {
				files.fileHeaders(res);
				files.contentType('text/html', res);
				res.end(css);
			}
			else {
				files.contentType(type, res);
				files.respondText(target, req, res);
			}
		});
	} else if (uri.pathname.match('/script/.*[.]js$') && fs.existsSync(uri.pathname.slice(1))) {
		/* JavaScript */
		files.respondFile(uri.pathname.slice(1), req, res);
	} else if (uri.pathname.match('/static/.*[.]jpg|jpeg$') && fs.existsSync(uri.pathname.slice(1))) {
		/* jpegs */
		filePath = uri.pathname.slice(1);
		files.respondFile(filePath, req, res);
	} else if (uri.pathname == '/favicon.ico') {
		/* favicon */
		filePath = 'static/favicon.ico';
		files.respondFile(filePath, req, res);
	} else if (uri.pathname == '/static/icon-hires.png' || uri.pathname == '/static/icon-hires.ico' || uri.pathname == '/icon.png') {
		/* hires icon */
		filePath = 'static/icon-hires.png';
		files.respondFile(filePath, req, res);
	} else if (uri.pathname == '/COPYING') {
		/* license */
		filePath = 'COPYING';
		files.contentType('text/plain', res);
		files.respondFile(filePath, req, res);
	} else if (uri.pathname == '/try_do_oauth') {
		/* OAuth2 attempt */
		if ('app' in uri.query) {
			sessions[res.SESSID].nord = true;
			if (DEBUG) {
				console.log('[core_debug] Won\'t redirect...');
			}
		}
		auth.getAuthCode(res, res.SESSID);
	} else if (uri.pathname == '/login') {
		/* OAuth2 handler */
		if (DEBUG) {
			console.log('[core_debug] ' + require('util').inspect(sessions[res.SESSID]));
		}
		if (sessions[res.SESSID].nord) {
			if (DEBUG) {
				console.log('[core_debug] Sending to /mobile_loading!');
			}
			auth.getAuthToken(res, uri, function() {
				files.textHeaders(res);
				res.writeHead(302, {'Location': '/mobile_loading?sessionID='+encodeURIComponent(res.SESSID)});
				res.end();
				//httpHeaders(res, req, 200, 'application/json', true);
				//res.end(JSON.stringify(global.sessions[res.SESSID]));
			}, false);
		} else {
			auth.getAuthToken(res, uri, function() {
				files.textHeaders(res);
				res.writeHead(302, {'Location': '/'});
				res.end();
			}, false);
		}
	} else if (uri.pathname == '/mobile_loading') {
		files.respondFile('static/appLoading.html', req, res);
	} else if (uri.pathname == '/session_info' && DEBUG) {
		/* Session info */
		//httpHeaders(res, req, 200, 'application/json', true);
		files.setContentType('application/json', res);
		files.textHeaders(res);
		var obj = {};
		obj[res.SESSID] = global.sessions[res.SESSID];
		res.end(JSON.stringify(obj));
	} else if (uri.pathname.match('/api/.*') && apis.isAPI(uri.pathname.slice(5))) {
		/* API calls */
		apis.get(uri.pathname.slice(5), uri.query, res.SESSID, function(obj) {
			target = JSON.stringify(obj);
			files.contentType('application/json', res);
			files.respondText(target, req, res);
		});
	} else if (uri.pathname == '/logout') {
		/* Log out */
		res.writeHead(302, { 'Location': '/' });
		res.end();
		delete global.sessions[res.SESSID].accessToken;
		delete global.sessions[res.SESSID].refreshToken;
		delete global.sessions[res.SESSID].accessTokenExpires;
		delete global.sessions[res.SESSID].refreshTokenExpires;
	} else if (uri.pathname == '/wat.html') {
		/* Landing page */
		filePath = 'static/wat.html';
		files.respondFile(filePath, req, res);
	} else if (uri.pathname == '/faq.html') {
		/* FAQs */
		files.respondFile('static/faq.html');
	} else if (uri.pathname == '/robots.txt') {
		filePath = 'static/robots.txt';
		files.respondFile(filePath, req, res);
	} else if (uri.pathname == '/reset_access_token') {
		/* Reset access token */
		files.setContentType('application/json');
		files.textHeaders(res);
		//httpHeaders(res, req, 200, 'application/json', true);
		delete global.sessions[res.SESSID].accessToken;
		global.sessions[res.SESSID].accessTokenExpires = 0;
		res.end(JSON.stringify(global.sessions[res.SESSID]));
	} else if (uri.pathname == '/refresh_token') {
		/* Refresh access token */
		files.setContentType('application/json');
		files.textHeaders(res);
		if (global.sessions[res.SESSID].refreshToken) {
			auth.refreshAuthToken(global.sessions[res.SESSID].refreshToken, res.SESSID, function() {
				res.end(JSON.stringify(global.sessions[res.SESSID]));
			});
		} else {
			res.end('{"error": "not logged in"}');
		}
	} else {
		/* 404 everything else */
		files.err404(res);
	}
}

function requestSafeWrapper(req, res) {
	/* Wrapper to return 500 if bad things happen */
	/* jshint validthis: true */
	'use strict';
	res.setTimeout(60000, function() {
		console.log('[timeout_debug] Request timed out :(');
		this.end('<html><head><title>We took too long</title></head><body><h1>Oops</h1></body></html>');
	});
	try {
		onRequest.call(this, req, res);
	} catch (e) {
		console.error('[core_error] ERROR HANDLING REQUEST: ' + req.url);
		console.error(e);
		console.error(e.stack);
		files.err500(res);
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
if (RELEASE || NO_GIT) {
	console.log('[core] SBHS-Timetable-Node version ' + REL_RV + ' starting server...');
} else {
	console.log('[core] SBHS-Timetable-Node revision ' + GIT_RV + ' starting server...');
}

/* cache the index page */
cache_index();

/* Start HTTP servers. */
/* NOHTTP defines that no HTTP servers will be started. You will need a program that can forward requests to the Unix socket. */
if (!NOHTTP) {
	/* Start the IPv4 server */
	ipv4 = http.createServer();
	ipv4.name = 'ipv4';
	ipv4.on('request', requestSafeWrapper);
	ipv4.on('listening', onListening);
	ipv4.listen(PORT, IPV4_IP);

	/* Start the IPv6 server if it is enabled */
	if (IPV6) {
		ipv6 = http.createServer();
		ipv6.name = 'ipv6';
		ipv6.on('request', requestSafeWrapper);
		ipv6.on('listening', onListening);
		ipv6.listen(PORT, IPV6_IP);
	}
}

/* Start the server on a Unix socket */
if (SOCKET) {
	socket = http.createServer();
	socket.name = 'socket';
	socket.on('request', requestSafeWrapper);
	socket.on('listening', onUnixListening);
	socket.path = '/tmp/sbhstimetable.socket';
	socket.listen(socket.path);
	fs.chmod(socket.path, '777');
} else if (!SOCKET && NOHTTP) {
	console.warn('[core_warn] NOHTTP is true, but socket not activated! Disable NOHTTP or make \'socket\' true in config.js');
}

setInterval(session.clearSessions, 900000); // clean expired sessions every 15 minutes
