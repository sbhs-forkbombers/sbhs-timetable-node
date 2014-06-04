function handleTopPane() {
	'use strict';
	var entry, list, today = new Date();
	if (!window.notices) {
		return;
	}
	var sorted = Object.keys(window.notices.notices).sort(function(a,b) {
		if (a >  b) {
			return -1;
		}
		return 1;
	});
	var res = '<h1 class="notices-header">Notices for ' + window.notices.date + ' (Week ' + window.notices.week + ')</h1><table><tbody>';
	for (var i in sorted) {
		list = window.notices.notices[sorted[i]];
		for (var j in list) {
			entry = list[j];
			res += '<tr id="'+entry.id+'" class="notice' + entry.years.join(' notice') + ' notice-row ' + (entry.isMeeting ? 'meeting' : '') + '">';
			res += '<td class="notice-target animated">'+entry.dTarget+'</td>';
			res += '<td class="notice-data"><h2 class="notice-title">'+entry.title+'</h2><div class="notice-hidden" id="n'+entry.id+'-hidden">';
			if (entry.isMeeting) {
				res += '<div class="notice-meeting"><strong>Meeting Date:</strong> ' + entry.meetingDate + '<br />';
				res += '<strong>Meeting Time:</strong> ' + entry.meetingTime + ' in ' + entry.meetingPlace + '<br />';
			}
			res += '<div id="n'+entry.id+'-txt" class="notice-content">';
			res += entry.text + '</div>&mdash;<div class="notice-author">'+entry.author+'</div></div></td></tr>';
		}
	}
	res += '</tbody></table>';
	$('#top-pane').html(res);
	$('.notice-row').click(function() {
		/*jshint validthis: true*/
		var id = this.id;
		$('#n'+id+'-hidden').slideToggle();
	});
}

function handleNotices(err) {
	/*jshint validthis: true*/
	'use strict';
	var lsKey = new Date().toDateString();
	var res = JSON.parse(this.response);
	if (res.notices) {
		window.localStorage[lsKey] = this.response;
		window.notices = res;
		handleTopPane();
	}
	else if (!window.notices) {
		$('#top-pane').html('<h1><a href="javascript:void(0)" onclick="loadNotices()">Reload</a></h1>');
	}
}

function loadNotices() {
	'use strict';
	var lsKey = new Date().toDateString();
	if (lsKey in window.localStorage) {
		window.notices = JSON.parse(window.localStorage[lsKey]);
		handleTopPane();
	}
	var xhr = new XMLHttpRequest();
	xhr.onload = handleNotices;
	xhr.open('GET', '/api/notices.json', true);
	xhr.send();
}
