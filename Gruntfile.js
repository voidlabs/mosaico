"use strict";
var path = require('path');

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);
  grunt.loadTasks('tasks');

  var pkg = grunt.file.readJSON("package.json");

  grunt.initConfig({

    pkg: pkg,

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
          require('autoprefixer')(),
          require('postcss-minify')()
        ]
      },
      dist: {
        src: 'build/mosaico.css',
        dest: 'dist/rs/mosaico.min.css'
      },
      material: {
        src: 'build/mosaico-material.css',
        dest: 'dist/rs/mosaico-material.min.css'
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
          // transforms are declared in the package.json ("aliasify", "browserify-versionify" are executed because declared there).
          // We only redeclare browserify-shim so to be able to pass the global argument to strip down depedencies.
          // We used to do run uglifyify transform as part of browserify but this now breaks sourcemapping
          // transform: [['browserify-shim', {global: true}], ['uglifyify', {global: true}]],
          transform: [ ['browserify-shim', {global: true}] ],
          cacheFile: 'build/main-incremental.bin',
        },
        files: {
          'build/mosaico.inlinesourcemap.js': ['./src/js/app.js', './build/templates.js']
        }
      }
    },

    // We use exorcise before uglify because uglify doesn't correctly handle inline sourcemaps.
    exorcise: {
      main: {
        options: {
          bundleDest: 'build/mosaico.js'
        },
        files: {
          'build/mosaico.js.map': ['build/mosaico.inlinesourcemap.js'],
        }
      }
    },

    watch: {
      // for each set of files we have to define the whole execution steps (recursion not supported)
      css: {
        files: ['src/css/*.less', 'src/**/*.css'],
        tasks: ['less', 'postcss']
      },
      tmpl: {
        files: ['src/tmpl/*.tmpl.html'],
        tasks: ['combineKOTemplates', 'browserify', 'exorcise', 'uglifyPrecheck:min']
      },
      browserify: {
        files: ['src/js/**/*.js', 'build/templates.js'],
        tasks: ['newer:jshint', 'browserify', 'exorcise', 'uglifyPrecheck:min']
      },
      htmls: {
        files: ['src/html/*.html'],
        tasks: ['copy:htmls']
      },

      web: {
        options: {
          livereload: true
        },
        files: ['dist/*.html', 'dist/**/*.js', 'dist/**/*.css'],
      },
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
          fontPath: './dist/rs/notoregular/',
          httpPath: './notoregular/',
          cssFile: './build/notoregular.css',
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
        dest: 'dist/rs/'
      },

      root: {
        src: 'favicon.ico',
        dest: 'dist/'
      },

      htmls: {
        expand: true,
        cwd: 'src/html',
        src: '*.html',
        dest: 'dist/',
        options: {
          process: function (content, srcpath) {
            return content.replace(/__VERSION__/g, pkg.version);
          },
        },
      },

      fontawesome: {
        expand: true,
        cwd: 'node_modules/font-awesome/fonts',
        src: 'fontawesome-webfont.*',
        dest: 'dist/rs/fontawesome/'
      },

    },

    cssmin: {
      deps: {
        files: {
          'dist/rs/<%= pkg.name %>-libs-and-tinymce.min.css': [
            /* 'node_modules/jquery-ui-package/jquery-ui.css', */
            'build/notoregular.css',
            /*
            'res/vendor/skins/gray-flat/skin.min.css',
            'res/vendor/skins/gray-flat/content.inline.min.css'
            */
          ]
        }
      }
    },

    uglify: {
      min: {
        options: {
          sourceMap: {
            includeSources: true
          },
          sourceMapIn: 'build/mosaico.js.map',
          banner: '/** \n'+
                  ' * <%= pkg.description %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> \n'+
                  ' * Licensed under the <%= pkg.license %> (<%= pkg.licenseurl %>)\n'+
                  ' * \n'+
                  ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %> \n'+
                  ' */',
        },
        files: {
          'dist/rs/mosaico.min.js': [ 'build/mosaico.js' ]
        }
      },
      deps: {
        options: {
          comments: 'some',
          sourceMap: {
            includeSources: true
          },
          banner: '/*! \n'+
                  ' * Bundle package for the following libraries:\n'+
                  ' * jQuery | (c) JS Foundation and other contributors | jquery.org/license\n'+
                  ' * jQuery Migrate v3.0.1 | (c) jQuery Foundation and other contributors | jquery.org/license\n'+
                  ' * Knockout | (c) The Knockout.js team | License: MIT (http://www.opensource.org/licenses/mit-license.php)\n'+
                  ' * jQuery UI | Copyright 2015 jQuery Foundation and other contributors; Licensed MIT\n'+
                  ' * jQuery UI Touch Punch | Copyright 2011-2014, Dave Furfero | Dual licensed under the MIT or GPL Version 2 licenses.\n'+
                  ' * jQuery File Upload Plugin + dependencies | Copyright 2010, Sebastian Tschan | Licensed under the MIT license: https://opensource.org/licenses/MIT\n'+
                  ' * knockout-jqueryui | Copyright (c) 2016 Vas Gabor <gvas.munka@gmail.com> Licensed MIT\n'+
                  ' * TinyMCE + Plugins | Copyright (c) 1999-2017 Ephox Corp. | Released under LGPL License. http://www.tinymce.com/license\n'+
                  ' */'
        },
        /* This is named "*and-tinymce.min.js" by purpose otherwise Tinymce on IE11 is unable to find its own skin */
        files: {
          'dist/rs/<%= pkg.name %>-libs-and-tinymce.min.js': [
            'node_modules/jquery/dist/jquery.js',
            // NOTE: use minimized version because non-min uses console to write migration warnings
            'node_modules/jquery-migrate/dist/jquery-migrate.min.js',
            'node_modules/knockout/build/output/knockout-latest.js',
            'node_modules/jquery-ui-package/jquery-ui.js',
            'node_modules/jquery-ui-touch-punch/jquery.ui.touch-punch.js',
            'node_modules/default-passive-events/dist/index.js',
            // NOTE: include these 2 BEFORE the fileupload libs
            // using npm5 we can get sub-dependencies from nested paths, but npm3 does flatten them, so let's depend on them explicitly.
            // 'node_modules/blueimp-file-upload/node_modules/blueimp-canvas-to-blob/js/canvas-to-blob.js',
            // 'node_modules/blueimp-file-upload/node_modules/blueimp-load-image/js/load-image.all.min.js',
            'node_modules/blueimp-canvas-to-blob/js/canvas-to-blob.js',
            'node_modules/blueimp-load-image/js/load-image.all.min.js',
            // 'node_modules/blueimp-file-upload/js/jquery.iframe-transport.js',
            'node_modules/blueimp-file-upload/js/jquery.fileupload.js',
            'node_modules/blueimp-file-upload/js/jquery.fileupload-process.js',
            'node_modules/blueimp-file-upload/js/jquery.fileupload-image.js',
            'node_modules/blueimp-file-upload/js/jquery.fileupload-validate.js',
            'node_modules/knockout-jqueryui/dist/knockout-jqueryui.js',
            'node_modules/tinymce/tinymce.js',
            'node_modules/tinymce/themes/modern/theme.js',
            'node_modules/tinymce/plugins/link/plugin.js',
            'node_modules/tinymce/plugins/hr/plugin.js',
            'node_modules/tinymce/plugins/paste/plugin.js',
            'node_modules/tinymce/plugins/lists/plugin.js',
            'node_modules/tinymce/plugins/textcolor/plugin.js',
            'node_modules/tinymce/plugins/code/plugin.js',
          ],
        }
      }
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
          'node-releases': 'CC-BY-4.0', // Not bundled, used at build time
        }
      }
    },

    compress: {
      dist: {
        options: {
          archive: 'release/<%= pkg.name %>-<%= pkg.version %>-dist.zip'
        },
        files: [
          { expand: true, cwd: 'dist', src: ['**'], dest: '/' },
          { src: ['templates/versafix-1/**', 'README.md', 'NOTICE.txt', 'LICENSE'], dest: '/' }
        ]
      }
    },

  });

  grunt.registerTask('js', ['combineKOTemplates', 'browserify', 'exorcise', 'uglifyPrecheck:min']);
  grunt.registerTask('css', ['less', 'postcss']);
  grunt.registerTask('server', ['express', 'watch', 'keepalive']);
  grunt.registerTask('deps', ['copy', 'uglifyPrecheck:deps', 'cssmin']);
  grunt.registerTask('build', ['googlefonts', 'deps', 'jshint', 'js', 'css']);
  grunt.registerTask('default', ['build', 'server']);
  grunt.registerTask('test', ['jasmine_node']);
  grunt.registerTask('dist', ['check_licenses', 'build', 'test', 'compress']);

};