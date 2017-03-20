"use strict";
var path = require('path');

module.exports = function(grunt) {
  grunt.registerMultiTask("makeThumbs", function(templateName) {
  	// var files = grunt.file.expand(this.data.src);
  	var async = require('async');
  	var data = this.data;
  	var script = this.data.script || './tasks/lib/phantom-thumbnailer-editor.js';
  	var done = this.async();
  	var tmplsDir;
  	if (typeof templateName != 'undefined') {
  		tmplsDir = grunt.file.expand(data.template.replace('%', templateName));
  	} else {
  		tmplsDir = grunt.file.expand(data.templates);
  	}
  	grunt.log.writeln("Creating thumbnails for templates", tmplsDir);

  	async.eachSeries(tmplsDir, function(templateFile, callback) {
  		grunt.log.writeln("Creating thumbnail", templateFile);

	    // var templateFile = './templates/ml/template-ml.html';
	    var outFolder = path.join(path.dirname(templateFile),data.outputFolder);
	  	var phantombin = require('phantomjs-prebuilt').path;
	  	var args = [];
	  	args.push(
	  	  script,
	  	  data.renderWidth,
	  	  data.outputWidth,
	  	  templateFile,
	  	  outFolder
	  	);

		// callback();
		// return;

	  	var phantomJSHandle = grunt.util.spawn({
	      cmd: phantombin,
	      args: args
	  	}, function(err, result, code) {
	      if (!err) { callback(); return; }

	      // Ignore intentional cleanup.
	      if (code === 15 /* SIGTERM */){ grunt.log.writeln("XXX15"); return; }

	      // If we're here, something went horribly wrong.
	      grunt.verbose.or.writeln();
	      grunt.log.write('PhantomJS threw an error:').error();
	      // Print result to stderr because sometimes the 127 code means that a shared library is missing
	      String(result).split('\n').forEach(grunt.log.error, grunt.log);
	      if (code === 127) {
	        grunt.log.errorlns(
	          'In order for this task to work properly, PhantomJS must be installed locally via NPM. ' +
	          'If you\'re seeing this message, generally that means the NPM install has failed. ' +
	          'Please submit an issue providing as much detail as possible at: ' +
	          'https://github.com/gruntjs/grunt-lib-phantomjs/issues'
	        );
	        grunt.warn('PhantomJS not found.', code);
	      } else {
	        grunt.warn('PhantomJS exited unexpectedly with exit code ' + code + '.');
	      }
	      // callback();
	  	});

	 	phantomJSHandle.stdout.pipe(process.stdout);
	    phantomJSHandle.stderr.pipe(process.stderr);

  	}, function(err) {
  		if (typeof err != 'undefined') grunt.log.writeln(err);
  		done();
  	});

  });

};