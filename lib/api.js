var http = require('http'),
    qs = require('querystring'),
    auth = require('./auth.js');

function getSHSAPI(path, token, params, post, cb) {
    'use strict';
	console.log('requesting SHS API ' + path);
    var req,
		b = function(z) {
            var progress = '';
			if (z.statusCode != 200) {
				console.log('error while getting ' + path + ': HTTP status ' + z.statusCode);
				cb({'error': 'not ok', 'status': z.statusCode});
				return;
			}
			var responded = false;
            z.on('data', function(d) {
                var obj = {};
                if (progress !== '') {
                    d = progress + d;
                }
                try {
                    obj = JSON.parse(d);
                    cb(obj);
					responded = true;
                }
                catch (e) {
                    console.log('oops ' + e);
                    console.log(e.stack);
                    //console.log('got a JSON chunk ending in ' + obj.substr(-10) + ' that was invalid, assuming that it\'s not done yet...');
                    progress += d;
                }
            });
			z.on('close', function() {
				if (!responded) {
					console.log(progress);
					cb({'error': 'Failed to parse JSON', 'status': 500, 'json': progress});
				}
			});
        };
    if (typeof params !== 'object') {
        params = {};
    }
    params.access_token = token;
    if (!post) {
        req = http.request({
            'host': 'student.sbhs.net.au',
            'path': path + '?' + qs.stringify(params),
            'method': 'GET'
        }, b);
    } else {
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
	'daytimetable.json': function(opts, sessID, cb) {
        'use strict';
		auth.refreshTokenIfNeeded(sessID, function() {
			var params = {};
			if ('date' in opts && opts.date !== '') {
				params.date = opts.date;
			}
			var session = sessions[sessID];
			getSHSAPI('/api/timetable/daytimetable.json', session.accessToken, params, false, cb);
		});
	},
	'today.json': function(opts, sessID, cb) {
		'use strict';
		apis['daytimetable.json'](opts, sessID, function(obj) {
			var prettified = {}, i, j, subjID, subjInfo;
			if (obj.timetable === undefined || obj.timetable === null) {
				cb({});
				return;
			}
			prettified.timetable = obj.timetable.timetable.periods;
			prettified.timetable.R = '';
			prettified.today = obj.timetable.timetable.dayname;
			for (i in prettified.timetable) {
				if (!prettified.timetable.hasOwnProperty(i) || i == 'R') {
					continue;
				}
				j = prettified.timetable[i];
				subjID = j.year + j.title;
				subjInfo = obj.timetable.subjects[subjID];
				prettified.timetable[i].fullName = subjInfo.title.split(' ')[1];
				prettified.timetable[i].fullTeacher = subjInfo.fullTeacher.replace(/ . /, ' ');
			}
			cb(prettified);
		});
	}
};

module.exports = apis;

module.exports = {
	'get': function request(name, opts, sessID, cb) {
        'use strict';
		if (name in apis && apis.hasOwnProperty(name)) {
			if (typeof opts !== 'object') {
				opts = {};
			}
			apis[name].call(null, opts, sessID, cb);
		}
		else {
			console.error('Invalid API: ' + name);
			cb({explosion: true, error: 'No such API'});
		}
	},
	'isAPI': function isAPI(name) {
        'use strict';
		return name in apis && apis.hasOwnProperty(name);
	}
};
