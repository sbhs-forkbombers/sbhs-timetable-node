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
       //             console.log('oops ' + e);
       //             console.log(e.stack);
                    //console.log('got a JSON chunk ending in ' + obj.substr(-10) + ' that was invalid, assuming that it\'s not done yet...');
                    progress += d;
                }
            });
			z.on('close', function() {
				if (!responded) {
					console.error('Didn\'t receive a full response from SBHS for ' + path + '!!! Giving up');
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
			var prettified = {}, i, j, subjID, subjInfo, variations = {};
			if (obj.timetable === undefined || obj.timetable === null) {
				cb({});
				return;
			}
			if (obj.shouldDisplayVariations) {
				// room variations
				j = obj.roomVariations;
				for (i in j) {
					subjID = j[i].year + j[i].title + '_' + j[i].period;
					variations[subjID] = {
						'roomFrom': j[i].roomFrom,
						'roomTo': j[i].roomTo
					};
				}
				// teacher variations
				j = obj.classVariations;
				for (i in j){
					subjID = j[i].year + j[i].title + '_' + j[i].period;
					if (subjID in variations) {
						variations[subjID].hasCover = (j[i].type !== 'nocover');
						variations[subjID].casual = j[i].casual;
						variations[subjID].casualDisplay = j[i].casualSurname;
	//					variations[subjID].origTeacherCode = j[i].teacher;
						variations[subjID].hasCasual = (j[i].type == 'replacement');
					}
					else {
						variations[subjID] = {
							'hasCover': (j[i].type !== 'nocover'),
							'casual': j[i].casual,
							'casualDisplay': j[i].casualSurname,
	//						'origTeacherCode': j[i].teacher,
							'hasCasual': (j[i].type == 'replacement')
						};
					}
				}
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
				subjID += '_' + i;
				prettified.timetable[i].changed = (subjID in variations);
				if (subjID in variations) {
					for (j in variations[subjID]) {
						prettified.timetable[i][j] = variations[subjID][j];
					}
				}
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
