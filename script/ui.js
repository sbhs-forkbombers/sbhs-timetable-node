/* SBHS-Timetable-Node: Countdown and timetable all at once (NodeJS app).
 * Copyright (C) 2014-2015 James Ye, Simon Shields
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

// functions for collapsing and expanding the panes

var lastScreenTap = Date.now(),
	screenTapId = 0;

function collapsePane(p) {
	/* Collapses a pane */
	'use strict';
	var el = $('#'+p+'-pane');
	var cfg = {};
	cfg[p] = '-110%';
	el.velocity('finish').velocity(cfg, 750, 'ease');
	$('#'+p+'-pane-arrow').removeClass('expanded');
	window[p+'Expanded'] = false;
}

function expandPane(p) {
	/* Expands a pane */
	'use strict';
	var el = $('#'+p+'-pane');
	var cfg = {};
	cfg[p] = 0;
	el.velocity('finish').velocity(cfg, 750, 'ease');
	$('#'+p+'-pane-arrow').addClass('expanded');
	window[p+'Expanded'] = true;
}

function togglePane(which) {
	/* Toggles expand state of a pane */
	'use strict';
	if (window[which+'Expanded']) {
		collapsePane(which);
	} else {
		expandPane(which);
	}
}

function toggleTop() {
	'use strict';
	if (topExpanded) {
		collapsePane('top');
		onScreenTapTimeout();
	} else {
		if (leftExpanded) {
			collapsePane('left');
		}

		if (rightExpanded) {
			collapsePane('right');
		}
		onInteract();
		expandPane('top');
	}
}

function toggleRight() {
	'use strict';
	if (rightExpanded) {
		collapsePane('right');
		onScreenTapTimeout();
	} else {
		if (topExpanded) {
			collapsePane('top');
		}

		if ((window.innerWidth <= 450) && leftExpanded) {
			collapsePane('left');
		}
		onInteract();
		expandPane('right');
	}
}

function toggleLeft() {
	'use strict';
	if (leftExpanded) {
		collapsePane('left');
		onScreenTapTimeout();
	} else {
		if (topExpanded) {
			collapsePane('top');
		}

		if ((window.innerWidth <= 450) && rightExpanded) {
			collapsePane('right');
		}
		onInteract();
		expandPane('left');
	}
}

// expand/deflate the countdown (this function is attached to the button in the top-left)
function toggleExpansion(ev) {
	/* jshint validthis: true */
	'use strict';
	if (ev.target.id == 'expand') {
		$('#countdown-label').css({fontSize: '10em', top: '50%', left: 0, width: '100%', marginTop: '-1em', position: 'fixed'});
		$('#period-label,#in-label,#feedback,#sidebar,.really-annoying').velocity('finish').velocity('fadeOut');
		$('#expand').css({display: 'none'});
		$('#collapse').css({'display': 'block'});
		window.localStorage.expanded = true;
	} else {
		$('#countdown-label').css({fontSize: miniMode ? '5em' : '7em', width: 'inherit', marginTop: 0, position: 'relative'})[0].setAttribute('style', '');
		$('#period-label,#in-label,#feedback,#sidebar,.really-annoying').velocity('finish').velocity('fadeIn');
		$('#collapse').css({display: 'none'});
		$('#expand').css({'display': 'block'});
		window.localStorage.expanded = false;
	}
}



function onScreenTapTimeout() {
	if ((Date.now() - lastScreenTap) > 3000) {
		if (topExpanded || rightExpanded || leftExpanded) {
			return;
		}
		$('.arrow').css({ opacity: 0 }).css({ visibility: 'hidden' });
		$('body').css({cursor: 'none'});
		$('#update,.really-annoying,#sidebar,#links').velocity('finish').velocity({ 'opacity': 0 }, { duration: 300 });
	} else {
		screenTapId = setTimeout(onScreenTapTimeout, 3000 - (Date.now() - lastScreenTap));
	}
}

function onInteract() {
	$('.arrow').css({ 'visibility': 'visible', 'opacity': 'inherit' });
	$('body').css({ 'cursor': 'default' });
	$('#update,.really-annoying,#sidebar,#links').velocity('finish').velocity({ 'opacity': 1 }, { duration: 300 });
	lastScreenTap = Date.now();
	if (screenTapId !== 0) {
		clearTimeout(screenTapId);
	}
	setTimeout(onScreenTapTimeout, 5000);
}


function snazzify(el) {
	'use strict';
	var r = Math.floor(Math.random()*255);
	var g = Math.floor(Math.random()*255);
	var b = Math.floor(Math.random()*255);
	$(el).velocity({colorRed: r, colorGreen: g, colorBlue: b});
}

function attachAllTheThings() {
	// show/hide the cached list
	if (!$.fn.velocity) {
		$.fn.velocity = function () {
			if (arguments[0] == 'finish') {
				return this;
			}
			$.fn.css.apply(this, arguments); // good enough
		}
	}
	$('#cached').click(function() {
		if ($('#dropdown-arrow').hasClass('expanded')) {
			$('#verbose-hidden').velocity('finish').velocity('slideUp', { duration: 300 });
			$('#dropdown-arrow').removeClass('expanded');
		} else {
			$('#verbose-hidden').velocity('finish').velocity('slideDown', { duration: 300 });
			$('#dropdown-arrow').addClass('expanded');
		}
	});

	// settings modal
	$('#launch-settings').click(function() {
		$('#settings-modal,#fadeout').velocity('finish').velocity('fadeIn');
	});

	$('#close-settings-modal').click(function() {
		$('#settings-modal,#fadeout').velocity('finish').velocity('fadeOut');
	});

	$('#custom-background').click(handleUpload);

	if ('cached-bg' in window.localStorage) {
		$('#custom-background').html('Clear');
	}
	var options = ['default', 'red', 'green', 'purple'];
	//$('#colourscheme-combobox')[0].selectedIndex = ((options.indexOf(config.colour) > -1) ? options.indexOf(config.colour) : 0);

	$('#colourscheme-combobox').change(function() {
		/*jshint validthis: true */
		var el = this.options[this.selectedIndex].value;
		if (/colour/.test(window.location.search)) {
			window.location.search = window.location.search.replace(/colour=.+?(\&|$)/, 'colour='+el+'&');
		}
		else {
			if (window.location.search.substr(0,1) === '?') {
				window.location.search += '&colour='+el;
			}
			else {
				window.location.search = '?colour='+el;
			}
		}
	});


	if (config.inverted) {
		$('#invert-enable')[0].checked = true;
	}

	$('#invert-enable').change(function() {
		/*jshint validthis: true */
		if (this.checked) {
			if (window.location.search.substr(0,1) === '?') {
				window.location.search = window.location.search + '&invert=1';
			}
			else {
				window.location.search = '?invert=1';
			}
		}
		else {
			window.location.search = window.location.search.replace(/.invert=.+?\&?/, '');
		}
	});
	// show/hide the panes
	$('#left-pane-arrow').click(toggleLeft);

	$('#top-pane-arrow').click(toggleTop);

	$('#right-pane-arrow').click(toggleRight);
	if ($('#left-pane-target').swipeRight) { // IE 9 doesn't support swipe functions
		$('#left-pane-target').swipeRight(toggleLeft);

		$('#right-pane-target').swipeLeft(toggleRight);

		$('#top-pane-target').swipeDown(toggleTop);

		$('#left-pane').swipeLeft(function() {
			collapsePane('left');
		});

		$('#right-pane').swipeRight(function() {
			collapsePane('right');
		});

		$('#bottom-pane-target').swipeUp(function() {
			collapsePane('top');
		});

		$('#cached').swipeDown(function() {
			$('#verbose-hidden').velocity('finish').velocity('slideDown', { duration: 300 });
			$('#dropdown-arrow').addClass('expanded');
		});

		$('#cached').swipeUp(function() {
			$('#verbose-hidden').velocity('finish').velocity('slideUp', { duration: 300 });
			$('#dropdown-arrow').removeClass('expanded');
		});
	}

	$(document).keydown(function(e) {
		if (e.which == 27) { // esc
			$('#settings-modal,#fadeout').velocity('finish').velocity('fadeOut');
		} else if (e.which == 83) { // s
			if ($('#settings-modal').css('display') !== 'block') {
				$('#settings-modal,#fadeout').velocity('finish').velocity('fadeIn');
			} else {
				$('#settings-modal,#fadeout').velocity('finish').velocity('fadeOut');
			}
		} else if (e.which == 69 || e.which == 81) { // e/q
			// fake an onClick event with an el that's either #expand or #collapse
			toggleExpansion({target: {id: (e.which == 69 ? 'expand' : 'collapse')}});
		} else if (e.which == 65 || e.which == 37) { // a/left arrow
			toggleLeft();
		} else if (e.which == 87 || e.which == 38) { // w/up arrow
			toggleTop();
		} else if (e.which == 68 || e.which == 39) { // d/right arrow
			toggleRight();
		}
	});

	if (window.PointerEvent) {
		document.addEventListener('pointerdown', onInteract);
	} else if (window.MSPointerEvent) {
		document.addEventListener('MSPointerDown', onInteract);
	}
	document.addEventListener('mousemove', onInteract);
	document.addEventListener('onclick', onInteract);
	document.addEventListener('touchstart', onInteract);
	screenTapId = setTimeout(onScreenTapTimeout, 5000);

	$('#expand,#collapse').on('click', toggleExpansion);

	if (window.localStorage.expanded === 'true') {
		$('#expand').click();
	}
}

function handleUpload() {
	'use strict';
	if ('cached-bg' in window.localStorage) {
		delete window.localStorage['cached-bg'];
		loadBackgroundImage();
		$('#custom-background').html('Choose...');
	}
	else {
		var input = $('<input type="file" accept="image/*">');
		input.on('change', function(e) {
			console.log('loading a file!');
			if (input[0].files && input[0].files[0]) {
				var reader = new FileReader();
				reader.onload = function(e) {
					base64Image(e.target.result, 1280, 720, function (b64) {
						localStorage.setItem('cached-bg', b64);
						loadBackgroundImage();
					});
				};
				reader.readAsDataURL(input[0].files[0]);
				$('#custom-background').html('Clear');
			}
		});
		console.log('requesting upload...');
		input.click();
	}
}

function base64Image(url, width, height, callback) {
	'use strict';
	var img = new Image();

	img.onload = function (evt) {
		var canvas = document.createElement('canvas');

		canvas.width  = width;
		canvas.height = height;

		var imgRatio    = img.width / img.height,
		canvasRatio = width / height,
		resultImageH, resultImageW;

		if (imgRatio < canvasRatio) {
			resultImageH = canvas.height;
			resultImageW = resultImageH * imgRatio;
		}
		else {
			resultImageW = canvas.width;
			resultImageH = resultImageW / imgRatio;
		}

		canvas.width  = resultImageW;
		canvas.height = resultImageH;
		canvas.getContext('2d').drawImage(img, 0, 0, resultImageW, resultImageH);
		callback(canvas.toDataURL());
	};

	img.src = url;
}

function loadBackgroundImage() {
	/* jshint -W041 */
	'use strict';
	if ('cached-bg' in window.localStorage) {
		var c = config.cscheme.bg.slice(1);
		var r = Number('0x'+c.substr(0,2));
		var g = Number('0x'+c.substr(2,2));
		var b = Number('0x'+c.substr(4,2));
		var rgb = 'rgba(' + r + ',' + g + ',' + b + ', 0.5)';
		$('#background-image').addClass('customBg');
		var style = document.createElement('style');
		// TODO why is this innerHTML not innerText wtf firefox
		style.innerHTML = '#background-image { background: linear-gradient(' + rgb + ',' + rgb + '), #' + c + ' url(' + window.localStorage['cached-bg'] + ') }';
		style.id = 'i-dont-even';
		document.head.appendChild(style);

	} else {
		$('#background-image').removeClass('customBg');
		var el = document.getElementById('i-dont-even');
		if (el != null) {
			document.head.removeElement(el);
		}
	}
}

function updateSidebarStatus() {
	/* Show load state info for various API data */
	'use strict';
	/* Loading state symbols */
	var tick = '<span class="octicon octicon-check ok"></span>',
		cross = '<span class="octicon octicon-x failed"></span>',
		cached = '<span class="octicon octicon-alert stale"></span>',
		loading = '<span class="idk">…</span>';
	/* Local variables */
	var belltimesOK = window.belltimes && belltimes.status == 'OK' && belltimes.httpStatus == 200,
		noticesOK = window.notices && window.notices.notices && !window.notices.notices.failure && window.notices.httpStatus == 200,
		timetableOK = window.today && today.httpStatus == 200 && today.timetable,
		belltimesClass = 'ok',
		belltimesText = 'OK',
		timetableClass = 'failed',
		timetableText = 'Failed',
		noticesClass = 'failed',
		noticesText = 'Failed',
		shortText = ['B: '+cross,'T: '+cross,'N: '+cross];

	if (belltimesOK) {
		belltimesText = 'OK';
		belltimesClass = 'ok';
		shortText[0] = 'B: ' + tick;
	}

	if (window.today && window.today.stale) {
		timetableText = 'Cached';
		timetableClass = 'stale';
		shortText[1] = 'T: ' + cached;
	} else if (timetableOK) {
		timetableText = 'OK';
		timetableClass = 'ok';
		shortText[1] = 'T: ' + tick;
	}

	if (noticesOK) {
		noticesText = 'OK';
		noticesClass = 'ok';
		shortText[2] = 'N: ' + tick;
	}

	var bells = document.getElementById('belltimes');
	bells.className = belltimesClass;
	bells.innerHTML = belltimesText;

	var timetable = document.getElementById('timetable');
	timetable.className = timetableClass;
	timetable.innerHTML = timetableText;

	var notices = document.getElementById('notices');
	notices.className = noticesClass;
	notices.innerHTML = noticesText;

	document.getElementById('shortdata-desc').innerHTML = shortText.join(' ');
}

EventBus.on('notices', updateSidebarStatus);
EventBus.on('bells', updateSidebarStatus);
EventBus.on('today', updateSidebarStatus);
