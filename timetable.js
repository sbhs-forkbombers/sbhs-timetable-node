/*
   Copyright (C) 2014  James Ye  Simon Shields

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
/* the gnustomp-forkbomb style guide:
   Single tabs for indentation
   Single quotes for strings
   Opening braces on the same line as the statement
   Spaces around operators
   Empty line after a function defenition
*/

all_start = Date.now();
console.log('[master] loading...');
var http = require('http'),
	fs = require('fs'),
	jade = require('jade'),
	url = require('url'),
	forcedETagUpdateCounter = 0,
	cachedBells = {},
	indexCache = '',
	db = {};

console.log('[master] finished initialisation in ' + (Date.now() - all_start) + 'ms');

require('./variables.js'); // set globals appropriate to status - dev (DEBUG = true) or release (DEBUG = false and GIT_RV set)
if (!RELEASE) {
	GIT_RV = fs.readFileSync('.git/refs/heads/master').toString().trim();
	var watcher = fs.watch('.git/refs/heads/master', { persistent: false }, function() {
		'use strict';
		GIT_RV = fs.readFileSync('.git/refs/heads/master').toString().trim();
	});
}

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
	console.log('[master] caching index page... [SIGHUP to reload]');
	var jade_comp = Date.now();
	var idx = compile_jade('dynamic/index.jade');
	index_cache = idx({title: ''});
	if (index_cache == serverError) {
		console.warn('WARNING: Encountered an error while caching index page. Fix errors, and then killall -HUP node to reload.');
	}
	console.log('[master] Done in ' + (Date.now() - jade_comp) + 'ms');
}

process.on('SIGHUP', function() {
	'use strict';
	forcedETagUpdateCounter++;
	cache_index();
	console.log('ETagUpdateCounts: ' + forcedETagUpdateCounter);
});

function httpHeaders(res, response, contentType, dynamic, headers) {
	'use strict';
	var date;
	dynamic = dynamic || false;
	headers = headers || {};
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
	}
	else {
		http.request({
			hostname: 'student.sbhs.net.au',
			port: 80,
			path: '/api/timetable/bells.json?date='+date,
			method: 'GET'
		}, function(rsp) {
			rsp.setEncoding('utf8');
			rsp.on('data', function(b) {
				cachedBells[date] = b;
				res.end(b);
			});
		}).end();
	}
}

function onRequest(req, res) {
	/*jshint validthis: true*/
	'use strict';
	var start = Date.now();
	if (req.headers['if-none-match'] == GIT_RV+'_'+forcedETagUpdateCounter && !DEBUG) {
		res.writeHead(304);
		res.end();
		return;
	}
	var target, uri = url.parse(req.url, true);
	if (uri.pathname === '/') {
		httpHeaders(res, (target == serverError ? 500 : 200), 'text/html', true);
		res.end(index_cache);
	} else if (uri.pathname.match('/style/.*[.]css$') && fs.exists(uri.pathname.slice(1))) {
		httpHeaders(res, 200, 'text/css');
		target = uri.pathname.slice(1);
		fs.createReadStream(target).pipe(res);
	} else if (uri.pathname == '/script/belltimes.js' && !RELEASE) {
		fs.createReadStream('script/belltimes.concat.js').pipe(res);
	} else if (uri.pathname.match('/script/.*[.]js$') && fs.exists(uri.pathname.slice(1))) {
		httpHeaders(res, 200, 'application/javascript');
		target = uri.pathname.slice(1);
		fs.createReadStream(target).pipe(res);
	} else if (uri.pathname === '/favicon.ico') {
		httpHeaders(res, 200, 'image/x-icon');
		fs.createReadStream('static/favicon.ico').pipe(res);
	} else if (uri.pathname == '/api/belltimes') { // belltimes wrapper
		httpHeaders(res, 200, 'application/json');
		getBelltimes(uri.query.date, res);
	} else if (uri.pathname.match('[.]ht.*')) {
		httpHeaders(res, 403, 'text/html');
		fs.createReadStream('static/403.html').pipe(res);
	} else {
		httpHeaders(res, 404, 'text/html');
		fs.createReadStream('static/404.html').pipe(res);
	}
	console.log('[' + this.name + ']', req.method, req.url, '- responded in', Date.now()-start + 'ms');
}

function onListening() {
	/*jshint validthis: true*/
	'use strict';
	console.log('[' + this.name + '] Listening on http://' + this.address().address + ':' + this.address().port + '/');
}

function writeDb() {
	'use strict';
	fs.writeFileSync('users.json', JSON.stringify(db));
}

var db_start = Date.now();
console.log('[master] Loading DB...');
if (fs.existsSync('users.json')) {
	db = JSON.parse(fs.readFileSync('users.json'));
}
setInterval(writeDb, 3000000);

console.log('[master] Done in', Date.now() - db_start,'ms');
console.log('[master] SBHS-Timetable-Node revision ' + GIT_RV.substr(0, 6) + ' starting server...');

index_cache = serverError;
cache_index();
var ipv4server = http.createServer(),
	ipv6server = http.createServer(),
	unixserver = http.createServer();

ipv4server.name = 'ipv4server';
ipv6server.name = 'ipv6server';
unixserver.name = 'unixserver';

ipv4server.on('request', onRequest);
ipv6server.on('request', onRequest);
unixserver.on('request', onRequest);

ipv4server.on('listening', onListening);
ipv6server.on('listening', onListening);
unixserver.on('listening', onListening);

ipv4server.listen(8080, '0.0.0.0');
if (IPV6) {
	ipv6server.listen(8080, '::');
}
if (process.platform !== 'win32') {
	unixserver.listen('/tmp/timetable.sock');
}
