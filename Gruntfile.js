module.exports = function(grunt) {

  //register tasks
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    //
    // Mocha testing unit/integration
    //
    mochaTest: {
      integration: {
        options: {
          require: ['should'],
          mocha: require('mocha')
        },
        src: ['test/integration/*.js']
      },
      unit: {
        options: {
          require: ['should'],
          mocha: require('mocha')
        },
        src: ['test/unit/*.js']
      }
    },

    //
    // Watch for file changes
    //
    watch: {
      src: {
        files: ['index.js', 'src/*.js'],
        tasks: ['mochaTest:unit', 'mochaTest:integration']

      },

      integration_tests: {
        files: ['test/integration/*.js', 'test/examples/**/*-example.js', 'test/examples/**/*.json'],
        tasks: ['mochaTest:integration']
      },
      unit_tests: {
        files: ['test/unit/*.js', 'test/unit/**/*.json'],
        tasks: ['mochaTest:unit', 'mochaTest:integration']
      },
    },

  });

  // Default task(s).
  grunt.registerTask('default', []);
  grunt.registerTask('test', ['mochaTest:integration']);
  grunt.registerTask('start', ['watch']);

};