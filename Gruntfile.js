/* 
 * Copyright (C) 2014  James Ye, Simon Shields
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

module.exports = function(grunt) {
    'use strict';
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		GIT_RV: require('fs').readFileSync('.git/refs/heads/master').toString().trim(),
		GIT_RV_SHORT: require('fs').readFileSync('.git/refs/heads/master').toString().trim().substr(0,6),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> rev. <%= GIT_RV_SHORT %> License: https://www.gnu.org/licenses/agpl-3.0.html (C) 2014.' +
                        ' Built: <%= grunt.template.today("yyyy-mm-dd H:MM Z") %> */\n',
				compress: {
					drop_console: true,
					global_defs: {
						DEBUG: false,
						RELEASE: true
					},
					dead_code: true
				},
				mangle: true
			},
			dynamic_mappings: {
				expand: true,
				src: ['script/belltimes.concat.js'],
				dest: 'build/',
				ext: '.js',
				extDot: 'last'
			}
		},
		jshint: {
			files: ['script/*.js', 'server.js', 'lib/*.js'],
			options: {
				jshintrc: true,
				reporter: require('jshint-stylish'),
			}
		},
		run: {
			options: {
				wait: true,
			},
			target: {
				args: [ 'server.js' ],
			}

		},
		cssmin: {
			minify: {
				expand: true,
				cwd: 'style',
				src: ['**/*.css', '!**/*.min.css'],
				dest: 'build/style/',
				ext: '.css'
			}/*, TODO this makes css files 2x bigger - do we really want it?
			add_banner: {
				options: {
					banner: '/* <%= pkg.name %> License: https://www.gnu.org/licenses/agpl-3.0.html (C) 2014. Built: <%= grunt.template.today("yyyy-mm-dd H:MM Z") %>'
				},
				files: [{
					expand: true,
					src: 'build/style/**.min.css',
					dest: 'build/style/',
					flatten: true,
				}]
			},*/
		},
		copy: {
			main: {
				expand: true,
				src: ['dynamic/**', 'static/**', 'server.js', 'lib/**', 'config.js'],
				dest: 'build/',
			},
			vars: {
				src: 'variables_rel.js',
				dest: 'build/variables.js',
				options: {
					process: function(content, srcpath) {
						return content + '\nGIT_RV = \'' + grunt.config.get('GIT_RV') + '\';\n';
					}
				}
			}
		},
		concat: {
			dist: {
				src: ['script/*.js', '!script/belltimes.concat.js'],
				dest: 'script/belltimes.concat.js'
			}
		},
		'delete': {
			run: 'true'
		},
		nodemon: {
			dev: {
				script: 'server.js',
				options: {
					callback: function(nm) {
						nm.on('restart', function() {
							if (require('fs').existsSync('/tmp/timetable.sock')) {
								require('fs').unlinkSync('/tmp/timetable.sock');
							}
							grunt.task.run('concat');
							console.log();
							console.log('[nodemon] *** RESTARTING ***');
							console.log();
						});
					},
					ignore: ['node_modules/**', 'Gruntfile.js', 'script/*', 'style/*', 'static/*']
				}
			}
		},
		watch: {
			scripts: {
				files: ['script/**.js', '!script/*.concat.js'],
				tasks: ['concat']
			},
			content: {
				files: ['style/*.css', 'dynamic/*.jade'],
				tasks: ['reload']
			}
		},
		concurrent: {
			develop: {
				tasks: ['watch', 'nodemon'],
				options: {
					logConcurrentOutput: true
				}
			}
		},
		reload: {
			why: 'is this necessary?'
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-run');
	grunt.loadNpmTasks('grunt-nodemon');
	grunt.loadNpmTasks('grunt-concurrent');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	
	grunt.registerMultiTask('delete', 'delete stuff', function() {
		if (process.platform !== 'win32' && require('fs').existsSync('/tmp/timetable.sock')) {
			require('fs').unlinkSync('/tmp/timetable.sock');
			grunt.log.writeln(this.target + ': deleted /tmp/timetable.sock');
		}
		else {
			grunt.log.writeln(this.target + ': nothing happened');
		}
	});

	grunt.registerMultiTask('reload', 'tell a process to reload', function() {
		require('fs').writeFile('.reload', '1');
	});

	grunt.registerTask('minify', ['uglify', 'cssmin']);
	grunt.registerTask('release', ['jshint', 'concat', 'minify', 'copy']);
	grunt.registerTask('default', ['delete', 'concat', 'concurrent:develop', 'delete']);
};
