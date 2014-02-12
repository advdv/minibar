module.exports = function(grunt) {

  //register tasks
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-nodemon');

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // todo example
    nodemon: {
      todo_example: {
        script: 'test/examples/todo/todo-example.js',
        options: {
          ext: 'js,json',
          watch: ['src', 'test']
        }
      }
    },

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
        src: ['test/unit/**/*_test.js']
      }
    },

    //
    // Watch for file changes
    //
    watch: {
      src: {
        files: ['index.js', 'src/**/*.js'],
        tasks: ['mochaTest:unit', 'mochaTest:integration']
      },

      integration_tests: {
        files: ['test/integration/*.js', 'test/examples/**/*-example.js', 'test/examples/**/*.json'],
        tasks: ['mochaTest:integration']
      },
      unit_tests: {
        files: ['test/unit/**/*_test.js', 'test/unit/**/*.json', 'test/unit/fixtures/**/*.html'],
        tasks: ['mochaTest:unit', 'mochaTest:integration']
      },
    },

  });

  // Default task(s).
  grunt.registerTask('default', []);
  grunt.registerTask('test', ['mochaTest:integration']);
  grunt.registerTask('start', ['watch']);
  grunt.registerTask('examples:todo', ['nodemon:todo_example']);

};