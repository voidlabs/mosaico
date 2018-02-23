"use strict";
var path = require('path');

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  grunt.loadTasks('tasks');

  grunt.initConfig({

    combineKOTemplates: {
      main: {
        src: "src/tmpl/*.tmpl.html",
        dest: "build/templates.js"
      }
    },

    jshint: {
      all: [
        'Gruntfile.js',
        'src/**/*.js',
      ],
      options: {
        reporter: require('jshint-stylish'),
        sub: true,
        jshintrc: true,
        browserify: true

      }
    },

    less: {
      options: {
        sourceMap: true,
        sourceMapRootpath: '../',
        /* sourceMapFilename: 'build/mosaico.css.map' */
        sourceMapFileInline: true
      },
      css: {
        files: {
          "build/mosaico.css": "src/css/app_standalone.less",
          "build/mosaico-material.css": "src/css/app_standalone_material.less"
        }
      }
    },

    postcss: {
      options: {
        map: {
          inline: false /* , prev: 'build/app.css.map' */
        },
        diff: false,
        processors: [
          require('autoprefixer')({
            browsers: 'ie 10, last 2 versions'
          }),
          require('csswring')()
        ]
      },
      dist: {
        src: 'build/mosaico.css',
        dest: 'dist/mosaico.min.css'
      },
      material: {
        src: 'build/mosaico-material.css',
        dest: 'dist/mosaico-material.min.css'
      }
    },

    browserify: {
      debug: {
        options: {
          browserifyOptions: {
            standalone: 'Mosaico'
          },
          transform: [['browserify-shim', {global: true}]],
          cacheFile: 'build/debug-incremental.bin',
        },
        files: {
          'build/mosaico.js': ['./src/js/app.js', './build/templates.js']
        }
      },
      main: {
        options: {
          browserifyOptions: {
            debug: true,
            fullPaths: false,
            standalone: 'Mosaico'
          },
          transform: [['browserify-shim', {global: true}], 'uglifyify'],
          cacheFile: 'build/main-incremental.bin',
        },
        files: {
          'build/mosaico.debug.js': ['./src/js/app.js', './build/templates.js']
        }
      }
    },

    exorcise: {
      main: {
        options: {
          bundleDest: 'dist/mosaico.min.js'
        },
        files: {
          'dist/mosaico.min.js.map': ['build/mosaico.debug.js'],
        }
      }
    },

    watch: {
      css: {
        files: ['src/css/*.less', 'src/**/*.css'],
        tasks: ['less', 'postcss']
      },
      tmpl: {
        files: ['src/tmpl/*.tmpl.html'],
        tasks: ['combineKOTemplates']
      },
      browserify: {
        files: ['src/js/**/*.js', 'build/templates.js'],
        tasks: ['browserify', 'exorcise']
      },
      exorcise: {
        files: ['build/mosaico.debug.js'],
        tasks: ['exorcise']
      },
      web: {
        options: {
          livereload: true
        },
        files: ['*.html', 'dist/**/*.js', 'dist/**/*.css'],
      },
      jshint: {
        files: ['src/js/**/*.js'],
        tasks: ['newer:jshint']
      }
    },

    express: {
      dev: {
        options: {
          script: 'backend/main.js',
          background: true,
          port: 9006,
        }
      }
    },

    googlefonts: {
      noto: {
        options: {
          fontPath: './dist/vendor/notoregular/',
          httpPath: './',
          cssFile: './dist/vendor/notoregular/stylesheet.css',
          formats: { eot: true, woff: true, svg: false, ttf: true, woff2: false },
          fonts: [
            {
              family: 'Noto Sans',
              styles: [ 400 ],
              subsets: [ 'latin' ]
            }
          ]
        }
      }
    },

    copy: {
      res: {
        expand: true,
        cwd: 'res',
        src: '**',
        dest: 'dist/'
      },

      tinymce: {
        expand: true,
        cwd: 'node_modules/tinymce/',
        src: ['plugins/**', 'skins/**', 'themes/**', 'tinymce.min.js'],
        dest: 'dist/vendor/'
      },
      
      knockout: {
        src: 'node_modules/knockout/build/output/knockout-latest.js',
        dest: 'dist/vendor/knockout.js'
      },
      
      jquery: {
        src: 'node_modules/jquery/dist/jquery.min.js',
        dest: 'dist/vendor/jquery.min.js'
      },
      
      jquerymigrate: {
        src: 'node_modules/jquery-migrate/dist/jquery-migrate.min.js',
        dest: 'dist/vendor/jquery-migrate.min.js'
      },
      
      jqueryui: {
        expand: true,
        cwd: 'node_modules/jquery-ui-package',
        src: 'jquery-ui.min.*',
        dest: 'dist/vendor/'
      },

      jqueryuitouchpunch: {
        src: 'node_modules/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js',
        dest: 'dist/vendor/jquery.ui.touch-punch.min.js'
      },
      
      knockoutjqueryui: {
        src: 'node_modules/knockout-jqueryui/dist/knockout-jqueryui.min.js',
        dest: 'dist/vendor/knockout-jqueryui.min.js'
      },

      fontawesome: {
        expand: true,
        cwd: 'node_modules/font-awesome/fonts',
        src: 'fontawesome-webfont.*',
        dest: 'dist/fa/fonts/'
      },

      blueimpfileupload: {
        expand: true,
        cwd: 'node_modules/blueimp-file-upload/js/',
        src: ['jquery.iframe-transport.js', 'jquery.fileupload.js', 'jquery.fileupload-process.js', 'jquery.fileupload-image.js', 'jquery.fileupload-validate.js'],
        dest: 'dist/vendor/'
      },

      canvastoblob: {
        src: 'node_modules/blueimp-canvas-to-blob/js/canvas-to-blob.min.js',
        dest: 'dist/vendor/canvas-to-blob.min.js'
      },

      loadimage: {
        src: 'node_modules/blueimp-load-image/js/load-image.all.min.js',
        dest: 'dist/vendor/load-image.all.min.js'
      },

    },

    jasmine_node: {
      main: {
        options: {
          coverage: {
            reportDir: 'build/coverage',
          },
          forceExit: true,
          captureExceptions: true,
          jasmine: {
            reporters: {
              spec: {},
              junitXml: {
                report: false,
                savePath: './build/jasmine/',
                useDotNotation: true,
                consolidate: true
              }
            }
          }
        },
        src: ['src/**/*.js']
      }
    },

    clean: {
      build: ['build/'],
      dist: ['dist/']
    }

  });

  grunt.registerTask('js', ['combineKOTemplates', 'browserify', 'exorcise']);
  grunt.registerTask('css', ['less', 'postcss']);
  grunt.registerTask('server', ['express', 'watch', 'keepalive']);
  grunt.registerTask('build', ['googlefonts', 'copy', 'jshint', 'js', 'css']);
  grunt.registerTask('default', ['build', 'server']);
  grunt.registerTask('test', ['jasmine_node']);
};