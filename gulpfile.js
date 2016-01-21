'use strict';

var gulp  = require('gulp');
var $     = require('gulp-load-plugins')();

function onError(err) {
  $.util.beep();
  if (err.annotated)      { $.util.log(err.annotated); }
  else if (err.message) { $.util.log(err.message); }
  else                  { $.util.log(err); }
  return this.emit('end');
}

////////
// CSS
////////

var autoprefixer  = require('autoprefixer');
var csswring      = require('csswring');

gulp.task('css', function () {
  return gulp.src('src/css/badsender.less')
    .pipe($.plumber(onError))
    .pipe($.sourcemaps.init())
    .pipe($.less())
    .pipe($.postcss([
        autoprefixer({ browsers: ['ie 10', 'last 2 versions'], }),
        csswring(),
      ]))
    .pipe($.sourcemaps.write())
    .pipe($.plumber.stop())
    .pipe(gulp.dest('dist'));
});

////////
// DEV
////////

gulp.task('dev', function () {
  gulp.watch('src/css/**/*.less', ['css']);
});
