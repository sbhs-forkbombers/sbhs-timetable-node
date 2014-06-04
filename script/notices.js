function handleTopPane() {
    'use strict';
}

function handleNotices(err) {
    /*jshint validthis: true*/
    'use strict';
    var lsKey = new Date().toDateString();
    var res = JSON.parse(this.response);
    if (res.notices) {
        window.localStorage[lsKey] = res;
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
