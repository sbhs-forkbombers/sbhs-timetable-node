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

var http = require('http'),
	fs = require('fs'),
	jade = require('jade'),
	url = require('url'),
	forcedETagUpdateCounter = 0;

require('./variables.js'); // set globals appropriate to status - dev (DEBUG = true) or release (DEBUG = false)
if (!RELEASE) {
	GIT_RV = fs.readFileSync('.git/refs/heads/master').toString().trim();
	var watcher = fs.watch('.git/refs/heads/master', { persistent: false }, function() {
		'use strict';
		GIT_RV = fs.readFileSync('.git/refs/heads/master').toString().trim();
	});
} else {
	GIT_RV = 'TODO'; // TODO
}


var jade_opts = {
	pretty: DEBUG,
	compileDebug: DEBUG
};

process.on('SIGHUP', function() {
	'use strict';
	forcedETagUpdateCounter++;
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

function serverError() {
	'use strict';
	return '<!DOCTYPE html><html><head><link rel="stylesheet" href="/style/common.css" /><title>500 Internal Server Error</title></head><body><h1 style="position:fixed;width:100%;text-align:center">Oops :(</h1></body></html>';
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

function onRequest(req, res) {
	/*jshint validthis: true*/
	'use strict';
	console.log('[' + this.name + ']', req.method, req.url);
	if (req.headers['if-none-match'] == GIT_RV+'_'+forcedETagUpdateCounter && !DEBUG) {
		res.writeHead(304);
		res.end();
		return;
	}
	var target, uri = url.parse(req.url, true);
	if (uri.pathname === '/') {
		target = compile_jade('dynamic/index.jade');
		httpHeaders(res, (target == serverError ? 500 : 200), 'text/html', true);
		res.end(target({'minified': MINIFY, 'page': ''}));
	} else if (uri.pathname.match('/style/.*[.]css$') && fs.existsSync(uri.pathname.slice(1))) {
		httpHeaders(res, 200, 'text/css');
		target = uri.pathname.slice(1);
		fs.createReadStream(target).pipe(res);
	} else if (uri.pathname.match('/script/.*[.]js$') && fs.existsSync(uri.pathname.slice(1))) {
		httpHeaders(res, 200, 'application/javascript');
		target = uri.pathname.slice(1);
		fs.createReadStream(target).pipe(res);
	} else if (uri.pathname === '/favicon.ico') {
		httpHeaders(res, 200, 'image/x-icon');
		fs.createReadStream('static/favicon.ico').pipe(res);
	} else {
		httpHeaders(res, 404, 'text/html');
		fs.createReadStream('static/404.html').pipe(res);
	}
}

function onListening() {
	/*jshint validthis: true*/
	'use strict';
	console.log('[' + this.name + '] Listening on http://' + this.address().address + ':' + this.address().port + '/');
}
console.log('[master] SBHS-Timetable-Node revision ' + GIT_RV.substr(0, 6) + ' loading...');
var ipv4server = http.createServer(),
	ipv6server = http.createServer();

ipv4server.name = 'ipv4server';
ipv6server.name = 'ipv6server';

ipv4server.on('request', onRequest);
ipv6server.on('request', onRequest);

ipv4server.on('listening', onListening);
ipv6server.on('listening', onListening);

ipv4server.listen(8080, '0.0.0.0');
if (IPV6) { //TODO: actually implement
	ipv6server.listen(8080, '::');
}
