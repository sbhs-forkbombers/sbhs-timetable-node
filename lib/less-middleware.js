/* SBHS-Timetable-Node: Countdown and timetable all at once (NodeJS app).
 * Copyright (C) 2015 James Ye, Simon Shields
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
var less = require('less'),
	fs = require('fs'),
	util = require('util');

//console.log(util.inspect(Object.keys(less)));

/*less.logger.addListener({
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error
});*/

module.exports = function(lessFolder, variablesHook) {
	return function(req, res, next) {
		var file = req.path.split('/').slice(-1)[0];
		if (file.slice(-4) == '.css') {
			file = lessFolder + '/' + file.split('.').slice(0,-1).join('.') + '.less';
			fs.readFile(file, {encoding: 'utf8'}, function(err, text) {
				// mmm nested functions
				if (err) {
					next();
					throw err;
				} else {
					less.render(text, { filename: file, modifyVars: variablesHook ? variablesHook(req, res) : {}, debug: true }, function (err, output) {
						if (err) throw err;
						res.append('Content-Type', 'text/css; encoding=utf-8');
						res.end(output);
					});
				}
			});
		} else {
			next();
		}
	}
};