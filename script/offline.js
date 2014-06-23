window.ONLINE = false;
(function() {
	'use strict';
	var today = new Date();
	var ds = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate();
	var normalBells = {
		'mon': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Lunch 1','time':'11:10'},{'bell':'Lunch 2','time':'11:30'},{'bell':'3','time':'11:50'},{'bell':'Transition','time':'12:50'},{'bell':'4','time':'12:55'},
			{'bell':'Recess','time':'13:55'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'tue': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Lunch 1','time':'11:10'},{'bell':'Lunch 2','time':'11:30'},{'bell':'3','time':'11:50'},{'bell':'Transition','time':'12:50'},{'bell':'4','time':'12:55'},
			{'bell':'Recess','time':'13:55'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'wed': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Recess','time':'11:10'},{'bell':'3','time':'11:30'},{'bell':'Lunch 1','time':'12:30'},
			{'bell':'Lunch 2','time':'12:50'},{'bell':'4','time':'13:10'},{'bell':'Transition','time':'14:10'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'thu': [
			{'bell':'Roll Call','time':'09:00'},{'bell':'1','time':'09:05'},{'bell':'Transition','time':'10:05'},{'bell':'2','time':'10:10'},
			{'bell':'Recess','time':'11:10'},{'bell':'3','time':'11:30'},{'bell':'Lunch 1','time':'12:30'},
			{'bell':'Lunch 2','time':'12:50'},{'bell':'4','time':'13:10'},{'bell':'Transition','time':'14:10'},{'bell':'5','time':'14:15'},{'bell':'End of Day','time':'15:15'}
		],
		'fri': [
			{'bell':'Roll Call','time':'09:25'},{'bell':'1','time':'09:30'},{'bell':'Transition','time':'10:25'},{'bell':'2','time':'10:30'},
			{'bell':'Lunch 1','time':'11:25'},{'bell':'Lunch 2','time':'11:45'},{'bell':'3','time':'12:05'},{'bell':'Transition','time':'13:00'},{'bell':'4','time':'13:05'},
			{'bell':'Recess','time':'14:00'},{'bell':'5','time':'14:20'},{'bell':'End of Day','time':'15:15'}
		]
	};
	var key = today.toDateString().split(' ')[0].toLowerCase();
	var res = normalBells.mon;
	if (key in normalBells) {
		res = normalBells[key];
	}
	var bells = {
		status: 'OK',
		bellsAltered: false,
		bellsAlteredReason: '',
		date: ds,
		day: key,
		term: '?',
		week: '?',
		weekType: '?',
		bells: res
	};
	window.belltimes = bells;
	window.bellsCached = true;
})();