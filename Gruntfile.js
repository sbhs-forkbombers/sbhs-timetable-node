module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> License: https://www.gnu.org/licenses/agpl-3.0.html (C) 2014. Built: <%= grunt.template.today("yyyy-mm-dd H:MM Z") %> */\n'
			},
			dynamic_mappings: {
				expand: true,
				src: ['script/*.js'],
				dest: 'build/',
				ext: '.min.js',
				extDot: 'last'
			}		
		},
		jshint: {
			files: ['script/*.js', 'timetable.js'],
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
				args: [ 'timetable.js' ],
			}

		},
		cssmin: {
			minify: {
				expand: true,
				cwd: 'style',
				src: ['**/*.css', '!**/*.min.css'],
				dest: 'build/style/',
				ext: '.min.css'
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
				src: ['dynamic/**', 'static/**', 'timetable.js'],
				dest: 'build/',
			},
			vars: {
				src: 'variables_rel.js',
				dest: 'build/variables.js'
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-run');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-copy');

	grunt.registerTask('minify', ['uglify', 'cssmin']);
	grunt.registerTask('release', ['jshint', 'minify', 'copy']);
	grunt.registerTask('default', ['run']);

		
};

