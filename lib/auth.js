var http = require('http');

function httpHeader(res, loc) {
	res.writeHead(301, {
		'Location': loc
	});
}

module.exports = {
	'getAuthCode': function(res, clientID, redirectURI, SESSID) {
		httpHeader(res,
			'https://student.sbhs.net.au/api/authorize?response_type=code&client_id='+encodeURIComponent(clientID)
			+'&redirect_uri='+encodeURIComponent(redirectURI)
			+'&scope=all-ro&state='+encodeURIComponent(SESSID)
		);
		res.end();
	},
	'getAuthToken': function(res, uri, redirectURI, clientID, secret, cb) {
		if ('code' in uri.query) {
			var onData = function(c) {
				var z = JSON.parse(c);
				var session = global.sessions[res.SESSID];
				httpHeader(res, '/?loggedIn=true');
				res.end();
				session.accessToken = c.access_token;
				session.refreshToken = c.refresh_token;
				session.accessTokenExpires = Date.now() + (1000 * 60 * 60);
				session.refreshTokenExpires = Date.now() + (1000 * 60 * 60 * 24 * 90);
				global.sessions[res.SESSID] = session;
				if (typeof cb === 'function') {
					cb();
				}
			};
			var req = http.request({
				'host': 'student.sbhs.net.au',
				'method': 'POST',
				'path': '/api/token',
				'headers': {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			}, function (e) { e.on('data', onData) });
			req.write('grant_type=authorization_code&code='+uri.query.code
					+'&redirect_uri='+encodeURIComponent(redirectURI)
					+'&client_id='+encodeURIComponent(clientID)
					+'&client_secret='+secret
					+'&state='+encodeURIComponent(uri.query.state)+'\n');
			req.end();
		}
	},
	'refreshAuthToken': function(redirectURI, clientID, secret, refreshToken, sessID, cb) {
		var onData = function (c) {
			var z = JSON.parse(c);
			var session = global.sessions[sessID];
			session.accessToken = c.access_token;
			session.accessTokenExpires = Date.now() + (1000 * 60 * 60);
			global.sessions[sessID] = session;
			if (typeof cb === 'function') {
				cb();
			}
		};

		var req = http.request({
			'host': 'student.sbhs.net.au',
			'method': 'POST',
			'path': '/api/token',
			'headers': {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		}, function (e) { e.on('data', onData) });
		req.write('grant_type=refresh_token&refresh_token='+refreshToken
				+'&redirect_uri='+encodeURIComponent(redirectURI)
				+'&client_id='+encodeURIComponent(clientID)
				+'&client_secret='+secret+'\n');
		req.end();
	}


}
