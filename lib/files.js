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
var fs = require('fs'),
	etag = require('./etag.js'),
	zlib = require('zlib');
 

(function (files) {
	'use strict';
	// add new filetypes to this map as they come along
	 var fileMap = {
	 	'js': 'application/javascript',
	 	'css': 'text/css',
	 	'json': 'application/json',
	 	'jpeg': 'image/jpeg',
	 	'jpg': 'image/jpeg',
	 	'png': 'image/png',
	 	'ico': 'image/x-icon',
	 	'html': 'text/html',
	 	'txt':  'text/plain'
	 };

	files.commonHeaders = function commonHeaders(srvRes) {
		srvRes.setHeader('X-Powered-By', 'Node.js ' + process.version + ' (' + process.platform + ' on ' + process.arch + '; like Gecko)');
	}

	files.fileHeaders = function fileHeaders(srvRes) {
		files.commonHeaders(srvRes);
		var date = new Date();
		date.setMonth(date.getMonth()+1);
		srvRes.setHeader('Expires', date.toGMTString());
	}

	files.textHeaders = function textHeaders(srvRes) {
		files.commonHeaders(srvRes);
		srvRes.setHeader('Cache-Control', 'no-cache, must-revalidate');
		srvRes.setHeader('Pragma', 'no-cache');
		srvRes.setHeader('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT');
	}

	function getCompressionCodec(req) {
		var headers = req.reqHeaders();
 		if ('accept-encoding' in headers) {
 			var encs = headers['accept-encoding'].replace(/q=\d\.\d/, '').split(/, ?/);
 			if (encs.indexOf('gzip') != -1) {
 				return 'gzip';
 			} else if (encs.indexOf('deflate') != -1) {
 				return 'deflate';
 			}
 		}
 		return null;
	}

	function compressPipe(path, res) {
	 	var result = fs.createReadStream(path);
		var codec = getCompressionCodec(res);
		if (codec === 'gzip') {
			if (DEBUG) {
				console.log('[compress_debug] using gzip compression');
			}
			res.setHeader('Content-Encoding', 'gzip');
			result = result.pipe(zlib.createGzip());
		}
		else if (codec === 'deflate') {
			if (DEBUG) {
				console.log('[compress_debug] using deflate compression');
			}
			res.setHeader('Content-Encoding', 'deflate');
			result = result.pipe(zlib.createDeflate());
		}
		res.writeHead(200);
		res.pipeFrom(result);
	 }

	function compressText(text, res) {
	 	var codec = getCompressionCodec(res);
	 	function finish(err, compressed) {
	 		res.writeHead(200);
	 		if (err) {
	 			console.warn('[text_compress] Error while compressing text: ');
	 			console.warn(err.stack);
	 			res.end(text);
	 		} else {
	 			res.end(compressed);
	 		}
	 	}
	 	if (codec === 'gzip') {
	 		res.setHeader('Content-Encoding', 'gzip');
	 		zlib.gzip(text, finish);
	 	} else if (codec === 'gzip') {
	 		res.setHeader('Content-Encoding', 'deflate');
	 		zlib.deflate(text, finish);
	 	} else {
	 		finish(undefined, text);
	 	}

	 }

	files.err500 = function serverError(result) {
	 	/* return the server error */
	 	result.writeHead(500, {'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=utf-8', 'Etag': '¯\\_(ツ)_/¯'});
		return (Math.random() < 0.9 ? fs.createReadStream('static/500.html') : fs.createReadStream('static/500.8.html')).pipe(result);
	 };

	files.err404 = function err404(result) {
	 	result.writeHead(404, {'content-type': 'text/html; charset=utf-8'});
	 	fs.createReadStream('static/404.html').pipe(result);
	 };

	files.respondFile = function respondFile(path, result) {
		/* respond to a request with a file */
		if (!result.hasType()) {
			var type = path.match(/\.(\w+?)$/)[1];
			if (fileMap.hasOwnProperty(type)) {
				type = fileMap[type];
			} else {
				console.warn('[file_response] unknown file extension "' + type + '" - falling back to text/html');
				type = 'text/html';
			}
			result.type(type);
		}		
		var reqHeads = result.reqHeaders();


		fs.exists(path, function(r) {
			if (r) {
				etag.file(path, function(err, tag) {
					if (tag == reqHeads['if-none-match']) {
						result.writeHead(304);
						result.end();
						return;
					}
					if (err === null) { // if the etag fails it doesn't really matter hugely
						result.setHeader('ETag', tag);
					}
					files.fileHeaders(result);
					
					compressPipe(path, result);
				});
				
			} else {
				err404(result);
				//console.error('[file_response] path ' + path + ' does not exist!');
			}
		});
		
	};

	files.respondText = function respondText(text, result) {
		/* respond to a request with some text */
		var reqHeads = result.reqHeaders();
		var tag = etag.text(text);
		if (!result.hasType()) {
			console.warn('[text_response] no content type set!');
			console.warn(Error().stack);
			result.type('text/plain');
		}
		if (tag == reqHeads['if-none-match']) {
			result.writeHead(304);
			result.end();
			return;
		}
		result.setHeader('ETag', tag);
		files.textHeaders(result);
		compressText(text, result);
	};

})(module.exports);