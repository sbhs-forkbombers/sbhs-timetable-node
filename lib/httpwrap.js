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
var file = require('./files.js'),
	url = require('url');
module.exports.Response = function Response(req, res) {
	'use strict';
	this.clientRequest = req;
	this.url = url.parse(req.url.replace('/../', ''));
	this.raw = res;
	this.contentType = null;
	this.headers = {};
	this.status = 200;
	this.isFile = false;
	this.file = null;
	this.text = null;
};

 (function(proto){
 	'use strict';

 	proto.type = function type(t) {
 		this.contentType = t;
 		this.headers['content-type'] = t + '; charset=utf-8';
 	};

 	proto.hasType = function hasType() {
 		return this.contentType !== null;
 	};

 	proto.cookie = function cookie(name, val)  {
 		if ('set-cookie' in this.headers) {
 			this.headers['set-cookie'].push(name + '=' + val);
 		} else {
 			this.headers['set-cookie'] = [name + '=' + val];
 		}
 	};

 	proto.header = function header(n,v) {
 		if (!n) {
 			return;
 		}
 		this.headers[n.toLowerCase()] = v;
 	};

 	proto.addHeaders = function header(obj) {
 		if (typeof obj !== 'object') {
 			return;
 		}
 		for (var i in Object.keys(obj)) {
 			this.headers[i] = obj[i];
 		}
 	};

 	proto.setHeader = proto.header;

 	proto.reqHeaders = function reqHeaders() {
 		return this.clientRequest.headers;
 	};

	proto.send = function send() {
		this.raw.writeHead(this.status, this.headers);
		if (this.isFile) {

		}
	};

	proto.writeHead = function writeHead(status, headers) {
		this.status = status;
		this.addHeaders(headers);
	};

	proto.end = function end() {
		this.raw.writeHead(this.status, this.headers);
		this.raw.end.apply(this.raw, arguments);
	};

	proto.pipeFrom = function pipeFrom(from) {
		this.raw.writeHead(this.status, this.headers);
		from.pipe(this.raw);
	};
})(module.exports.Response.prototype);
