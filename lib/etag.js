var crypto = require('crypto'),
	fs = require('fs');
	lastModifiedTimes = {};

function hashFile(file, done) {
	'use strict';
	var cs = crypto.createHash('sha1');
	cs.setEncoding('hex');
	var fd = fs.createReadStream(file);
	fd.on('end', function() {
		cs.end();
		done(cs.read());
	});
	fd.pipe(cs);
}

module.exports = {
	'file': function(file, done) {
		'use strict';
		var mtime;
		try {
			mtime = fs.lstatSync(file).mtime;
			if (file in lastModifiedTimes) {
				if (mtime > lastModifiedTimes[file]) {
					// generate a new etag
					hashFile(file, function(hash) {
						lastModifiedTimes[file] = hash;
						done(null, 'W/"' + hash + '"');
					});
				}
				else {
					done(null, 'W/"' + lastModifiedTimes[file] + '"');
				}
			}
			else {
				hashFile(file, function(hash) {
					lastModifiedTimes[file] = hash;
					done(null, 'W/"' + hash + '"');
				});
			}
		}
		catch (e) {
			console.error('[etag] Exception happened!');
			console.error(e);
			console.error(e.stack);
			if (typeof done === 'function') {
				done(e + '');
			}
			return;
		}
	},
	'text': function(text, done) {
		'use strict';
		var cs = crypto.createHash('sha1');
		cs.setEncoding('hex');
		cs.update(text);
		cs.end();
		var res = 'W/"' + cs.read() + '"';
		console.log(res);
		done(res);
	},
	'syncText': function(text) {
		'use strict';
		var cs = crypto.createHash('sha1');
		cs.setEncoding('hex');
		cs.update(text);
		cs.end();
		var res = 'W/"' + cs.read() + '"';
		return res;
	}
};
