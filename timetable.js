/*jshint curly: true, devel: true, indent: 4, latedef: true, quotmark: single, undef: true, unused: true, strict: true, trailing: true */
/*global require*/
/* the gnustomp-forkbomb style guide:
	Single tabs for indentation
	Single quotes for strings
	Opening curly brackets on the same line as the statement
*/

var http = require('http'),
	fs = require('fs');

function onRequest(req, res) {
	/*jshint validthis: true*/
	'use strict';
	console.log('[' + this.name + ']', req.method, req.url);
	
	if (req.url === '/') {
		res.writeHead(200, {
			'Content-Type': 'text/html'
		});
		fs.createReadStream('construction.html').pipe(res);
	} else if (req.url === '/belltimes.js') {
		res.writeHead(200, {
			'Content-Type': 'application/javascript'
		});
		fs.createReadStream('belltimes.js').pipe(res);
	} else if (req.url.match('/.*[.]css$') && fs.existsSync(req.url.slice(1))){
		res.writeHead(200, {
			'Content-Type': 'text/css'
		});
		fs.createReadStream(req.url.slice(1)).pipe(res);
	} else {
		res.writeHead(404, {
			'Content-Type': 'text/html'
		});
		fs.createReadStream('404.html').pipe(res);
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
