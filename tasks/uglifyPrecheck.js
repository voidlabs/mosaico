"use strict";
var path = require('path');

module.exports = function(grunt) {

    /**
     * Custom task to check files exist before running the "uglify:bundles" task.
     */
    grunt.task.registerTask('uglifyPrecheck', 'Tests files exist', function() {
      const bundle = this.args[0];
      const bundles = bundle ? [ bundle ] : Object.keys(grunt.config.get('uglify'));

      bundles.forEach(function(bundle) {
        const filesConfig = grunt.config.get('uglify')[bundle].files;

        // Merge file arrays into a single array.
        const inputFiles = [];
        Object.keys(filesConfig).forEach(function(key) {
          Array.prototype.push.apply(inputFiles, filesConfig[key]);
        });

        const missingFiles = inputFiles
          // 1. Remove any duplicate files from array.
          .filter(function(file, idx, arr) {
            return arr.indexOf(file) === idx;
          })
          // 2. Test whether each file exists and log if missing.
          .filter(function(file) {
            if (! grunt.file.exists(file)) {
              grunt.log.error('Missing file: ' + file['cyan']);
              return file;
            }
          });

        // Abort the task if we have missing files
        if (missingFiles.length) {
          grunt.fail.warn('Missing input '
            + (missingFiles.length > 1 ? 'files' : 'file')
            + ' for "uglify" task.'
          );
        }

        // All input files exists, so let's run the "uglify" task.
        grunt.task.run(['uglify:'+bundle]);
      });
    });

}
