
http = require 'http'
url = require 'url'
fs = require 'fs'

getResponse = (req, res) ->
	failure = () -> # :(
		headers['Content-Type'] = "text/html"
		res.writeHead 404, headers
		res.end "<html><head><title>Not here yet</title></head><body><h1>Sorry :(</h1></body></html>"

	console.log req.url
	headers =
		Server: "nginx/1.5.12"
		'Content-Type': "text/plain"
	uri = url.parse req.url
	if uri.pathname is '/belltimes.js'
		headers["Content-Type"] = "application/javascript"
		res.writeHead 200, headers
		fs.createReadStream('belltimes.js').pipe res
	else if /\/style\/([^/]+)\.css$/.test uri.pathname 
		try
			console.log "Match..."
			match = (uri.pathname.match /\/style\/([^/]+)\.css$/)[1]
			console.log "CreateReadStream..."
			rstr = fs.createReadStream("style/#{match}.css")
			console.log "Pipe..."
			rstr.pipe res
			console.log "CLEAR!"
		catch e
			# meh
			console.log "Caught #{e}"
			failure()
	else
		failure()
srv = http.createServer getResponse
srv.listen 80, '0.0.0.0'



