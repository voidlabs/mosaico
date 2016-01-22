'use strict';

var gulp        = require('gulp');
var $           = require('gulp-load-plugins')();
var browserSync = require('browser-sync').create();
var reload      = browserSync.reload;
var lazypipe    = require('lazypipe');
var args        = require('yargs').argv;
var isDev       = args.prod !== true && args.preprod !== true;
var isPreprod   = args.preprod === true;

var cyan        = require('chalk').cyan;
console.log(cyan('build with env', isDev ? 'dev' : isPreprod ? 'preprod' : 'prod'));

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

var cssDev        = lazypipe()
  .pipe($.sourcemaps.write)
  .pipe($.plumber.stop)
  .pipe(gulp.dest, 'dist')
  .pipe(reload, {stream: true});

gulp.task('css', function () {
  return gulp.src('src/css/badsender*.less')
    .pipe($.plumber(onError))
    .pipe($.sourcemaps.init())
    .pipe($.less())
    .pipe($.postcss([
        autoprefixer({ browsers: ['ie 10', 'last 2 versions'], }),
        csswring(),
      ]))
    .pipe(cssDev());
});

////////
// DEV
////////

var init = true;
gulp.task('nodemon', function (cb) {
  return $.nodemon({
    script: 'index.js',
    // nodeArgs: ['--harmony'],
    ext: 'js json',
    watch: ['server/*.js', '.badsenderrc', 'index.js'],
    env:    {
      'NODE_ENV': isDev ? 'development' : isPreprod ? 'preprod' : 'production',
      'pioc': 'clapou',
    }
  }).on('start', function () {
    // https://gist.github.com/sogko/b53d33d4f3b40d3b4b2e#comment-1457582
    if (init) {
      init = false;
      cb();
    }
  });
});

gulp.task('browser-sync', ['nodemon'], function () {
  browserSync.init({
    proxy: 'http://localhost:3000',
    open: false,
    port: 7000,
    ghostMode: false,
  });
});

gulp.task('dev', ['browser-sync'], function () {
  gulp.watch(['server/views/*.jade', 'dist/*.js']).on('change', reload);
  gulp.watch('src/css/**/*.less', ['css']);
});
