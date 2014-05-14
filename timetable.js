/*jshint curly: true, devel: true, indent: 4, latedef: true, quotmark: single, undef: true, unused: true, strict: true, trailing: true */
/*global require*/
/* the gnustomp-forkbomb style guide:
	Single tabs for indentation
	Single quotes for strings
	Opening curly brackets on the same line as the statement
*/

var http = require('http'),
	fs = require('fs'),
	jade = require('jade'),
	url = require('url')
	DEBUG = true;

var jade_opts = {
	pretty: DEBUG,
	compileDebug: DEBUG
};

function onRequest(req, res) {
	/*jshint validthis: true*/
	'use strict';
	console.log('[' + this.name + ']', req.method, req.url);
	var j, uri = url.parse(req.url, true);
	if (uri.pathname === '/') {
		res.writeHead(200, {
			'Content-Type': 'text/html'
		});
		j = jade.compile(fs.readFileSync('dynamic/index.jade', {encoding: "utf8"}), jade_opts);
		res.end(j({'something': (uri.query.something ? true : false)}));
//		fs.createReadStream('static/construction.html').pipe(res);
	} else if (uri.pathname === '/script/belltimes.js') {
		res.writeHead(200, {
			'Content-Type': 'application/javascript'
		});
		fs.createReadStream('script/belltimes.js').pipe(res);
	} else if (uri.pathname.match('/style/.*[.]css$') && fs.existsSync(uri.pathname.slice(1))){
		res.writeHead(200, {
			'Content-Type': 'text/css'
		});
		fs.createReadStream(uri.pathname.slice(1)).pipe(res);
	} else {
		res.writeHead(404, {
			'Content-Type': 'text/html'
		});
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

ipv4server.listen(8080, '127.0.0.1');
ipv6server.listen(8080, '::1');
