'use strict';

import gulp from 'gulp';
import autoprefixer from 'gulp-autoprefixer';
import babel from 'gulp-babel';
import browserify from 'browserify';
import browserSync from 'browser-sync';
import concat from 'gulp-concat';
import source from 'vinyl-source-stream';
import eslint from 'gulp-eslint';
import babelify from 'babelify';
import gulpSequence from 'gulp-sequence';
import nsp from 'gulp-nsp';

const AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

gulp.task('default', ['dist'], () => {
});

gulp.task('lint', () => {
  return gulp.src(['src/**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('styles', () => {
  return gulp.src(['src/styles/**'])
      .pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
      .pipe(concat('onedrive-file-picker.css'))
      .pipe(gulp.dest('dist'));
});

gulp.task('build', ['lint', 'styles'], () => {
  return browserify({
    entries: ['src/index.js'],
    standalone: 'OneDriveFilePicker',
  })
  .transform(babelify)
  .bundle()
  .pipe(source('onedrive-file-picker.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('install', ['nsp', 'build']);

gulp.task('nsp', (done) => {
  nsp({ package: __dirname + '/package.json' }, done);
});

gulp.task('demo', ['build'], function() {
  browserSync({
    port: 5000,
    notify: false,
    logPrefix: 'PSK',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function(snippet) {
          return snippet;
        }
      }
    },
    https: true,
    server: {
      baseDir: ["demo", "dist"],
      files: ["demo", "dist"]
    }
  });

  gulp.watch(['demo/*'], browserSync.reload);
  gulp.watch(['src/**'], ['build', browserSync.reload]);
});
