var http = require('http');
var qs = require('querystring');
var auth = require('./auth.js');
function getSHSAPI(path, token, params, post, cb) {
		var req,
			b = function(z) {
				if (z.statusCode != 200) {
					console.log('error while getting ' + path + ': HTTP status ' + z.statusCode);
					cb({'error': 'not ok'});
					return;
				}
				z.on('data', function(d) {
					cb(JSON.parse(d));
				});
			};
		if (typeof params !== 'object') {
			params = {};
		}
		params['access_token'] = token;
		if (!post) {
			req = http.request({
				'host': 'student.sbhs.net.au',
				'path': path + '?' + qs.stringify(params),
				'method': 'GET'
			}, b);
		}
		else {
			req = http.request({
				'host': 'student.sbhs.net.au',
				'path': path,
				'method': 'POST',
				'headers': {
					'Content-Type': 'application/x-form-www-urlencoded'
				}
			}, b);
			req.write(qs.stringify(params));
		}
		req.end();
}

var apis = {
	'today.json': function(date, sessID, cb) {
		auth.refreshTokenIfNeeded(sessID, function() {
			var params = {};
			if (date !== '') {
				params.date = date;
			}
			var session = sessions[sessID];
			getSHSAPI('/api/timetable/daytimetable.json', session.accessToken, params, false, cb);
		});
	}
}

module.exports = apis;
