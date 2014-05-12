
http = require 'http'
url = require 'url'
fs = require 'fs'

getResponse = (req, res) ->
	console.log req.url
	headers =
		Server: "nginx/1.5.12"
		'Content-Type': "text/plain"
	uri = url.parse req.url
	if uri.pathname is '/belltimes.js'
		headers["Content-Type"] = "application/javascript"
		res.writeHead 200, headers
		fs.createReadStream('belltimes.js').pipe res
	
	else
		headers["Content-Type"] = "text/html"
		res.writeHead 404, headers
		res.end "<html><head><title>Not here yet</title></head><body><h1>Sorry :(</h1></body></html>"

srv = http.createServer getResponse
srv.listen 80, '0.0.0.0'



