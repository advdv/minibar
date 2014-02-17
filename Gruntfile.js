module.exports = function (grunt) {

  //register tasks
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-shell');

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // todo example
    nodemon: {
      todo_example: {
        script: 'test/examples/todo/todo-example.js',
        options: {
          ext: 'js,json,html',
          nodeArgs: ['--harmony-proxies'],
          watch: ['src', 'test']
        }
      }
    },

    //run shell testing
    shell: {                        
        unit_test: {                    
            options: {
                stdout: true,
                stderr: true
            },
            command: './node_modules/.bin/mocha ./test/unit/**/*_test.js --require should --harmony-proxies'
        },
        integration_test: {
            options: {
                stdout: true,
                stderr: true
            },
            command: './node_modules/.bin/mocha ./test/integration --require should --harmony-proxies'
        }
    },

    //
    // Watch for file changes
    //
    watch: {
      src: {
        files: ['index.js', 'src/**/*.js'],
        tasks: ['shell:unit_test', 'shell:integration_test']
      },

      integration_tests: {
        files: ['test/integration/*.js', 'test/examples/**/*-example.js', 'test/examples/**/*.json'],
        tasks: ['shell:integration_test']
      },
      unit_tests: {
        files: ['test/unit/**/*_test.js', 'test/unit/**/*.json', 'test/unit/fixtures/**/*.html'],
        tasks: ['shell:unit_test', 'shell:integration_test']
      },
    },

  });

  // Default task(s).
  grunt.registerTask('default', []);
  grunt.registerTask('test', ['shell:unit_test', 'shell:integration_test']);
  grunt.registerTask('start', ['watch']);
  grunt.registerTask('examples:todo', ['nodemon:todo_example']);

};