var jsdom = require('jsdom');
module.exports = {
	notices: {},
	get: function notices_get(date, callback) {
        'use strict';
		if (date.toString('yyyy-MM-dd') in notices) {
			callback(notices[date.toString('yyyy-MM-dd')]);
			return;
		}
		jsdom.env('http://staff.sbhs.net.au/dailynotices?view=list&type=popup&date='+date.toString('yyyy-MM-dd'),
				[],
				function (errors, window) {
					var res = [],
						byYearGroup = {7: [], 8: [], 9: [], 10: [], 11: [], 12: [], 'staff': []},
						idx = 0,
						i, j, k;
					// cue intense DOM traversal
					var document = window.document,
						noticeBrace = document.getElementsByClassName('notice-brace')[1],
						rows = noticeBrace.getElementsByTagName('tr'),
						entry, appl, title, author, body, item, prettyAppl;
					console.log('Got ' + rows.length + ' notices');
					for (i in rows) {
						if (rows.hasOwnProperty(i)) {
							entry = rows[i];
							appl = entry.className.replace('meeting','').trim().split(' ');
							prettyAppl = entry.children[0].children[0].innerHTML.trim(); // <div class='notice-application'>
							item = entry.children[1]; // <div class='notice-item'>
							title = item.children[0].innerHTML.trim(); // <div class='notice-title'>
							k = item.children[1].getElementsByTagName('b');
							author = k[k.length - 1].innerHTML.trim(); // the last <b> (aka the author)
							body = item.children[1].innerHTML.trim().replace('<p><b>' + k[k.length-1].innerHTML + '</b></p>', ''); // <div class='notice-content'>
							res[idx] = {
								'title': title,
								'applicability': appl,
								'displayAppl': prettyAppl,
								'meeting': (entry.className.search('meeting') > -1),
								'body': body,
								'author': author
							};
							for (j in appl) {
								if (appl.hasOwnProperty(j)) {
									k = appl[j].split('-')[1];
									if (k != 'staff') {
										k = Number(k);
									}
									byYearGroup[k].push(idx);
								}
							}
							idx++;
						}
					}
					module.exports.notices[date.toString('yyyy-MM-dd')] = { 'notices': res, 'years': byYearGroup };
					callback({notices: res, years: byYearGroup});
				}
		);
	}
};


		

