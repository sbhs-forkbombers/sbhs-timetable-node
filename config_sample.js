module.exports = {
	'secret': 'ItsASecretToEverybody',
	'clientID': 'NotWhatYoureLookingFor',
	'redirectURI': 'https://en.wikipedia.org/wiki/Main_Page',
	'privateKeyFile': 'COPYING',
	'certificateFile': 'COPYING'
};
IPV6 = false;
/* Either SPDY _OR_ HTTPS can be true, NOT BOTH */
SPDY = false;
HTTPS = false;

HTTP2 = false;
/* Listen only on a Unix socket */
NOHTTP = false;
