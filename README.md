SBHS-Timetable v2.0
====================

This is a rewrite of [SBHS Timetable](https://github.com/sbhs-forkbombers/sbhs-timetable) for Node.js.

A live version can be found at [sbhstimetable.tk](http://sbhstimetable.tk), or for those after a non-scrub alternative, you may see [here](http://rhc.sbhstimetable.tk)<sup>1</sup>

Join `##sbhstimetable` on [freenode](http://freenode.net) for more swag.

<hr />
<sup>1</sup>Hipster mode may be identical to normal mode.

## Installation

You'll need [Node.js](http://nodejs.org), npm and Git (obviously).

1. Clone the repository: `git clone https://github.com/sbhs-forkbombers/sbhs-timetable-node`
2. Install the dependencies: `cd sbhs-timetable-node && npm install`
3. Rename config\_sample.js to config.js and configure the values appropriately.
4. Install `grunt-cli` globally (if it's not already): `npm install -g grunt-cli` (may need to be superuser).
5. Unleash the nodeiness: `grunt`

Note that this does not work if it's not in a git repo, i.e. you downloaded a zip instead of cloning the repo, shitlord. In that case, you can still run it by executing `server.js` directly, but this is entirely unsupported. Just do it properly you little shit.

### Running the stable release version.

Do steps 1-4 from above. Then:

1. Minify and lint everything: `grunt release`
2. Run the script: `cd build && node server.js`

You should probably do this on a tagged release, instead of `master`.
