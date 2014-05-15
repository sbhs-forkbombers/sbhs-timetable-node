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
	url = require('url');

DEBUG = true;

var jade_opts = {
	pretty: DEBUG,
	compileDebug: DEBUG
};

function httpHeaders(res, response, contentType, dynamic, headers) {
	'use strict';
	var date;
	dynamic = dynamic || false;
	headers = headers || {};
	if (dynamic || DEBUG) { // disable caching
		headers.cacheControl = 'no-cache';
	}
	else if (!dynamic) {
		date = new Date();
		date.setYear(date.getFullYear() + 1);
		headers.expires = date.toGMTString();
	}
	headers.contentType = contentType + '; charset=UTF-8';
	res.writeHead(response, headers);
	return res;
}

function compile_jade(path) {
	'use strict';
	var mopts = jade_opts;
	mopts.filename = path;
	return jade.compile(fs.readFileSync(path), mopts);
}

function onRequest(req, res) {
	/*jshint validthis: true*/
	'use strict';
	console.log('[' + this.name + ']', req.method, req.url);
	var j, uri = url.parse(req.url, true);
	if (uri.pathname === '/') {
		httpHeaders(res, 200, 'text/html', true);
		j = compile_jade('dynamic/index.jade');
		res.end(j({'something': (uri.query.something ? true : false), 'page': ''}));
	} else if (uri.pathname === '/script/belltimes.js') {
		httpHeaders(res, 200, 'application/javascript');
		fs.createReadStream('script/belltimes.js').pipe(res);
	} else if (uri.pathname.match('/style/.*[.]css$') && fs.existsSync(uri.pathname.slice(1))){
		httpHeaders(res, 200, 'text/css');
		fs.createReadStream(uri.pathname.slice(1)).pipe(res);
	} else {
		httpHeaders(res, 404, 'text/html');
		fs.createReadStream('static/404.html').pipe(res);
	}
}

function onListening() {
	/*jshint validthis: true*/
	'use strict';
	console.log('[' + this.name + '] Listening at http://' + this.address().address + ':' + this.address().port + '/');
}

var ipv4server = http.createServer(),
	ipv6server = http.createServer();

ipv4server.name = 'ipv4server';
ipv6server.name = 'ipv6server';

ipv4server.on('request', onRequest);
ipv6server.on('request', onRequest);

ipv4server.on('listening', onListening);
ipv6server.on('listening', onListening);

ipv4server.listen(8080, '0.0.0.0');
ipv6server.listen(8080, '::');
