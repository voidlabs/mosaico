'use strict';

var gulp  = require('gulp');
var $     = require('gulp-load-plugins')();
var args  = require('yargs').argv;

gulp.task('bump', function(){
  gulp.src('./*.json')
  .pipe($.bump({version: args.pkg}))
  .pipe(gulp.dest('./'));
});

gulp.task('default', ['bump']);
