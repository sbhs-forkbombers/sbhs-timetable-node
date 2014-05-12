var http = require('http');
var url  = require('url');
var fs   = require('fs');

function getResponse(req, res) {
	console.log(url.parse(req.url).pathname);
	if (url.parse(req.url).pathname == '/belltimes.js') {
		res.writeHead(200, {
			'Content-Type': 'application/javascript'
		});
		fs.createReadStream('belltimes.js').pipe(res);
	}
	else {
		res.writeHead(404, "Coming Soon(tm)", {
			'Content-Type': 'text/html'
		});
		res.end("<html><head><title>Not here yet</title></head><body><h1>Sorry :(</h1></body></html>");
	}
}

http.createServer(getResponse).listen(80, '0.0.0.0');





