module.exports = {
	/* API settings. These values must be obtained from My SBHS Apps. */
	/* App ID */
	'clientID': 'NotWhatYoureLookingFor',
	/* App Secret */
	'secret': 'ItsASecretToEverybody',
	/* Redirect URI */
	'redirectURI': 'https://en.wikipedia.org/wiki/Main_Page',

	/* App settings */
	/* Enable IPv6. If you don't know what this is, ignore it. */
	'ipv6': false,
	/* Don't listen on TCP. If you don't know what this is, ignore it. */
	'nohttp': false,
	/* Listen on a UNIX socket. If you don't know what this is, ignore it */
	'socket': false,
	/* port to listen on. You can probably leave this on the default (8080) */
	'port': 8080,
	/* IPv4 address to listen on */
	'ipv4_ip': '0.0.0.0',
	/* IPv6 address to listen on */
	'ipv6_ip': '::',
	/* location of sessions.json - defaults to root directory */
	'sessions': 'sessions.json',
	/* force disable holiday mode */
	'disableHoliday': false,


	/* Runtime settings */
	/* Location of Closure Compiler jar */
	'closure': 'node_modules/closurecompiler/compiler/compiler.jar'
};
