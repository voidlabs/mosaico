"use strict";
var path = require('path');

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  grunt.loadTasks('tasks');

  grunt.initConfig({

    pkg: grunt.file.readJSON("package.json"),

    pkgVersion: "<%= pkg.version %>",

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
      main: {
        options: {
          browserifyOptions: {
            debug: true,
            fullPaths: false,
            standalone: 'Mosaico'
          },
          transform: [['browserify-shim', {global: true}], ['uglifyify', {global: true}]],
          cacheFile: 'build/main-incremental.bin',
          banner: '/** \n'+
                  ' * <%= pkg.description %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> \n'+
                  ' * Licensed under the <%= pkg.license %> (<%= pkg.licenseurl %>)\n'+
                  ' * \n'+
                  ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %> \n'+
                  ' */',
        },
        files: {
          'build/mosaico.js': ['./src/js/app.js', './build/templates.js']
        }
      }
    },

    exorcise: {
      main: {
        options: {
          bundleDest: 'dist/mosaico.min.js'
        },
        files: {
          'dist/mosaico.min.js.map': ['build/mosaico.js'],
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
        files: ['build/mosaico.js'],
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
        src: 'node_modules/knockout-jqueryui/dist/knockout-jqueryui.js',
        dest: 'dist/vendor/knockout-jqueryui.js'
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
    },

    check_licenses: {
      main: {
        exclude: 'MIT, ISC, BSD, Apache-2.0, BSD-3-Clause, BSD-2-Clause, CC0-1.0, Unlicense, Public Domain',
        whitelist: {
          /* SELF */
          'mosaico': 'GPL-3.0', // SELF
          /* MIT with bad license declarations */
          'expand-template': 'MIT', // Say "WTFPL" but on github project says "All code, unless stated otherwise, is dual-licensed under WTFPL and MIT."
          'font-awesome': 'MIT', // (OFL-1.1 AND MIT)
          'jshint': 'MIT', // (MIT AND JSON)
          'pako': 'MIT', // (MIT AND Zlib)
          'xmldom': 'MIT', // MIT or LGPL (https://github.com/jindw/xmldom/blob/master/LICENSE)
          'spdx-expression-parse': 'MIT', // (MIT AND CC-BY-3.0)
          'spdx-expression-validate': 'MIT', // (MIT AND CC-BY-3.0)
          /* Optional runtime dependency */
          'tinymce': 'LGPL-2.1', // LGPL-2.1, optional runtime dependency
          /* CC-BY licensed */
          'caniuse-lite': 'CC-BY-4.0', // Not bundled, used at build time
          'spdx-exceptions': 'CC-BY-3.0', // Not bundled, used at build time
          'spdx-ranges': 'CC-BY-3.0', // Not bundled, used at build time
        }
      }
    },

    compress: {
      dist: {
        options: {
          archive: 'release/<%= pkg.name %>-<%= pkg.version %>-bin.zip'
        },
        files: [
          { src: ['dist/**', 'templates/versafix-1/**', '*.html', 'README.md', 'NOTICE.txt', 'LICENSE', 'favicon.ico'], dest: '/' },
        ]
      }
    },

    release: {
      options: {
        additionalFiles: ['package-lock.json'],
        tagName: 'v<%= version %>',
        // the release 0.14.0 plugin is buggy and they are all done BEFORE the tagging, so we stick to 0.13.1 until a new proper release is done.
        beforeRelease: ['clean', 'build'],
        afterRelease: ['compress'],
        npm: false,
        github: {
          repo: 'voidlabs/mosaico',
          accessTokenVar: 'GITHUB_ACCESS_TOKEN',
        }
      },
    },

  });

  grunt.registerTask('js', ['combineKOTemplates', 'browserify', 'exorcise']);
  grunt.registerTask('css', ['less', 'postcss']);
  grunt.registerTask('server', ['express', 'watch', 'keepalive']);
  grunt.registerTask('build', ['googlefonts', 'copy', 'jshint', 'js', 'css']);
  grunt.registerTask('default', ['build', 'server']);
  grunt.registerTask('test', ['jasmine_node']);
  grunt.registerTask('dist', ['check_licenses', 'build', 'test', 'compress']);

};