module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> License: https://www.gnu.org/licenses/agpl-3.0.html */\n'
			},
			dynamic_mappings: {
				expand: true,
				src: ['script/*.js'],
				dest: 'build/',
				ext: '.min.js',
				extDot: 'last'
			}		
		},
		run: {
			options: {
				wait: true,
			},
			target: {
				args: [ 'timetable.js' ],
			}

		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-run');

	grunt.registerTask('minify', ['uglify']);
	grunt.registerTask('default', ['run']);

		
};

