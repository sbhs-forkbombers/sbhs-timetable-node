var session = require('../lib/session.js'),
	should = require('should'),
	fs = require('fs');
process.env.NODE_ENV = 'test';
session.sessionPath = './sessions_test.json';
global.DEBUG = false;
function assertSessionsEmpty() {
	fs.readFileSync(session.sessionPath, {encoding: 'utf-8'}).should.equal('{}');
	fs.unlinkSync(session.sessionPath);
}

describe('session', function() {
	describe('#loadSessions()', function() {
		it('should load an empty sessions file', function() {
			session.wipeSessions();
			session.loadSessions();
			session.getSessions().should.be.an.Object;
			session.getSessions().should.have.keys();
		});
	});
	describe('#createSession()', function() {
		var id;
		it('should return a unique ID', function() {
			id = session.createSession();
			id.should.match(/^[a-f0-9-]/);

		});
		it('should set the expiry date', function() {
			var data = session.getSessionData(id);
			data.should.have.ownProperty('expires')
			data.expires.should.be.a.Number;
		});
	});
	describe('#saveSession*()', function() {
		it('should save asynchronously', function(done) {
			session.wipeSessions();
			session.saveSessions(done);
		});
		it('should have produced a json file', assertSessionsEmpty);
		it('should save synchronously', function() {
			session.wipeSessions();
			session.saveSessionsSync();
		});
		it('should have produced another json file', assertSessionsEmpty);
	});
	describe('#cleanSessions', function() {
		var testData = {
			expired: {
				expires: Date.now() - 5000,
				key: true,
				big: false
			},
			small: {
				expires: Date.now() + 24*60*60*1000
			},
			noExpires: {
				value: '3tiny5u'
			},
			valid: {
				expires: Date.now() + 24*60*60*1000,
				swag: 'swagalicious',
				ready: ['set', 'go']
			}
		};
		it('should accept the test data', function() {
			session.setSessions(testData);
			session.getSessions().should.have.keys('expired', 'small', 'noExpires', 'valid');
		});
		it('should clean all but the valid session', function() {
			session.cleanSessions();
			session.getSessions().should.have.keys('valid');

		});
	});
	describe('#getSession', function() {
		it('should get the session ID from the cookie', function() {
			var id = session.getSession('__cfduid=cloudflarethebestflare; SESSID=hellothere');
			id.should.equal('hellothere');
		});

		it('should get the session ID when there is only one cookie', function() {
			var id = session.getSession('SESSID=hellothere');
			id.should.equal('hellothere');
		});

		it('should return null if no cookie header is given', function() {
			var id = session.getSession(null);
			(id === null).should.be.true;
		});

		it('should return null if no SESSID cookie is found', function() {
			var id = session.getSession('cookie=swag; anothercookie=gr8');
			(id === null).should.be.true;
		});
	})
});
try {
	fs.unlinkSync(session.sessionPath);
} catch (e) {}