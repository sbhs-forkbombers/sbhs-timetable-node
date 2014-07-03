/* SBHS-Timetable-Node: Countdown and timetable all at once (NodeJS app).
 * Copyright (C) 2014 James Ye, Simon Shields
 *
 * This file is part of SBHS-Timetable-Node.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var crypto = require('crypto'),
	fs = require('fs'),
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
				} else {
					done(null, 'W/"' + lastModifiedTimes[file] + '"');
				}
			} else {
				hashFile(file, function(hash) {
					lastModifiedTimes[file] = hash;
					done(null, 'W/"' + hash + '"');
				});
			}
		} catch (e) {
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
