'use strict';

module.exports = function (grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);
  var config = {
    app: 'resources',
    dist: 'dist'
  };

  grunt.initConfig({
    config: config,
    clean: ["./dist"],
    concurrent: {
      dev: {
        tasks: ['nodemon', 'watch'],
        options: {
          logConcurrentOutput: true
        }
      }
    },
    mkdir: {
      dist: {
        options: {
          create: ['./dist']
        }
      }
    },
    develop: {
      developServer: {
        file: 'app.js'
      },
      distServer: {
        file: 'app.js',
        env: { NODE_ENV: 'dist', PORT: 3001 }
      }
    },
    exec: {
      makeDist: {
        cmd: 'rm -rf dist && mkdir dist'
      },
      bower: {
        cmd: 'bower install'
      }
    },
    karma: {
      e2e: {
        configFile: 'karma-e2e.conf.js',
        singleRun: true
      },
      unit: {
        configFile: 'karma.conf.js',
        singleRun: true
      },
      server: {
        configFile: 'karma.conf.js',
        singleRun: false,
        autoWatch: true
      }
    },
    sass: {
      options: {
        includePaths: [
          'bower_components'
        ]
      },
      dev: {
        files: [{
          expand: true,
          cwd: '<%= config.app %>/stylesheets',
          src: ['*.scss'],
          dest: 'public/stylesheets',
          ext: '.css'
        }]
      },
      dist: {
        files: [{
          expand: true,
          cwd: '<%= config.app %>/stylesheets',
          src: ['*.scss'],
          dest: '/dist/stylesheets',
          ext: '.css'
        }]
      },
      server: {
        files: [{
          expand: true,
          cwd: '<%= config.app %>/stylesheets',
          src: ['*.scss'],
          dest: '/dist/stylesheets',
          ext: '.css'
        }]
      }
    },
    watch:{
      css: {
        files: '**/*.scss',
        tasks: ['sass:dev'],
        options: {
          livereload: true,
        },
      }
    },
    copy: {
      dist: {
        files: [
          {
            expand: true,
            dot: true,
            cwd: 'public',
            dest: 'dist',
            src: [
              './**'
            ]
          }
        ]
      }
    },
    nodemon: {
      dev: {
        options: {
          file: 'app.js',
          nodeArgs: ['--debug'],
          ignoredFiles: ['node_modules/**'],
          watchedFolders: ['public','resources','routes','views'],
          env: {
            PORT: '4000'
          }
        }
      }
    }
  });

  /**
   * Install and run tests
   */
  grunt.registerTask('default', [
    'install',
    'dist'
  ]);

  /**
   * Run end to end tests for static compilation
   */
  grunt.registerTask('dist', [
    'develop:distServer',
    'clean',
    'mkdir:dist',
    'karma:e2e',
    'copy:dist'
  ]);

  /**
   * Run nodemon dev to execute app.js development mode and auto-reload node app on file changes
   */
  grunt.registerTask('serve', [
    'sass:dev',
    'concurrent:dev'
  ]);

  /**
   * Run end to end tests
   */
  grunt.registerTask('e2e', [
    'develop:distServer',
    'karma:e2e'
  ]);

  /**
   * Prepare the environment for usage, this gets called after npm install
   */
  grunt.registerTask('install', [
    'exec:bower'
  ]);

};