SBHS-Timetable v2.0
====================

This is going to be a rewrite of [SBHS Timetable](https://github.com/sbhs-forkbombers/sbhs-timetable) for Node.js.

We hope.

_(Note that these instructions may not be up to date.)_

## Installation

_This is a pre-alpha version. Beware._

You'll need [NodeJS](http://nodejs.org), Git (obviously) and NPM.

NPM dependencies (if you're curious):
* Grunt
* grunt-contrib-jshint
* grunt-contrib-uglifyjs
* grunt-contrib-cssmin
* grunt-contrib-copy
* grunt-run
* jade
* jshint
* jshint-stylish

1. Clone the repository: `git clone https://github.com/sbhs-forkbombers/sbhs-timetable-node`
2. Install the dependencies: `cd sbhs-timetable-node && npm install`
3. Add your API key to the file 'secret.js' as follows: 
```javascript
module.exports = 'My Super Secret Key!';
```
4. Unleash the nodeiness: `grunt`

### Running a minified version

Repeat steps 1-3 from above. Then:

1. Minify and lint everything: `grunt release`
2. Run the script: `cd build && node timetable.js`
