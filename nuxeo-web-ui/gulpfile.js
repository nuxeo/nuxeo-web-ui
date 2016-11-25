/*
(C) Copyright 2016 Nuxeo SA (http://nuxeo.com/) and others.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Contributors:
    Nelson Silva <nsilva@nuxeo.com>
 */

'use strict';

// Include Gulp & tools we'll use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var merge = require('merge-stream');
var path = require('path');
var through = require('through2');
var mergeJson = require('gulp-merge-json');
var path = require('path');
var fs = require('fs');

var AUTOPREFIXER_BROWSERS = [
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

var DIST = 'target/classes/web/nuxeo.war/ui';

var dist = function(subpath) {
  return !subpath ? DIST : path.join(DIST, subpath);
};

var APP = dist('bower_components/nuxeo-web-ui')

var app = function(subpath) {
  return !subpath ? APP : path.join(APP, subpath);
};

var styleTask = function(stylesPath, srcs) {
  return gulp.src(srcs.map(function(src) {
    return path.join(app(), stylesPath, src);
  }))
      .pipe($.changed(stylesPath, {extension: '.css'}))
      .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
      .pipe(gulp.dest('.tmp/' + stylesPath))
      .pipe($.minifyCss())
      .pipe(gulp.dest(dist(stylesPath)))
      .pipe($.size({title: stylesPath}));
};

var imageOptimizeTask = function(src, dest) {
  return gulp.src(path.join(app(), src))
      .pipe($.imagemin({
        progressive: true,
        interlaced: true
      }))
      .pipe(gulp.dest(dest))
      .pipe($.size({title: 'images'}));
};

var optimizeHtmlTask = function(src, dest) {
  return gulp.src(src)
    // Concatenate and minify JavaScript
      .pipe($.if('*.js', $.uglify({
        preserveComments: 'some'
      })))
    // Concatenate and minify styles
    // In case you are still using useref build blocks
      .pipe($.if('*.css', $.minifyCss()))
      .pipe($.useref({
        searchPath: ['.tmp', app(), dist()]
      }))
    // Minify any HTML
      .pipe($.if('*.html', $.minifyHtml({
        quotes: true,
        empty: true,
        spare: true
      })))
    // Output files
      .pipe(gulp.dest(dest))
      .pipe($.size({
        title: 'html'
      }));
};

// Compile and automatically prefix stylesheets
gulp.task('styles', function() {
  return styleTask('styles', ['**/*.css']);
});

// Optimize images
gulp.task('images', function() {
  return imageOptimizeTask('images/**/*', dist('images'));
});

gulp.task('copy', function() {
  gulp.src([
    app('*.{html,ico}'),
    app('manifest.json'),
    app('elements/**/*'),
    app('i18n/**/*'),
    app('styles/**/*')
  ], {
    base: app()
  }).pipe(gulp.dest(dist()));
  // copy user-group-management layouts
  gulp.src([dist('bower_components/nuxeo-ui-elements/nuxeo-user-group-management/nuxeo-view-user.html'),
            dist('bower_components/nuxeo-ui-elements/nuxeo-user-group-management/nuxeo-edit-user.html')])
      .pipe(gulp.dest(dist('nuxeo-user-group-management')));
});

// Fix select2
gulp.task('fixSelect2', function() {
    return gulp.src([dist('bower_components/select2/select2.png'),
            dist('bower_components/select2/select2-spinner.gif'),
            dist('bower_components/select2/select2x2.png')])
      .pipe(gulp.dest(dist('vendor')));
});

// Scan your HTML for assets & optimize them
gulp.task('html', function() {
  return optimizeHtmlTask(
      [app('index.html')],
      dist());
});

// Vulcanize granular configuration
gulp.task('vulcanize', function() {
  return gulp.src(dist('elements/elements.html'))
      .pipe($.vulcanize({
        stripComments: true,
        inlineCss: true,
        inlineScripts: true
      }))
      .pipe($.replace('assetpath="..\/bower_components', 'assetpath="bower_components'))
      //.pipe($.minifyInline())
      .pipe(gulp.dest(dist()))
      .pipe($.size({title: 'vulcanize'}));
});

// Move dynamic layouts to root
gulp.task('move-layouts', function() {
  return gulp.src([
    dist('elements/document/**'),
    dist('elements/search/**'),
    dist('elements/nuxeo-admin/**'),
    dist('elements/workflow/**'),
    dist('elements/nuxeo-home.html')
  ], {base: dist('elements')}).pipe(gulp.dest(dist()));
});

// Strip unnecessary stuff
gulp.task('strip', function() {
  return del([
    dist('index.html'), // use our JSP
    dist('elements'),
    dist('bower_components/**'),
    '!' + dist('bower_components'),
    '!' + dist('bower_components/nuxeo-ui-elements'),
    '!' + dist('bower_components/nuxeo-ui-elements/viewers'),
    '!' + dist('bower_components/nuxeo-ui-elements/viewers/pdfjs'),
    '!' + dist('bower_components/nuxeo-ui-elements/viewers/pdfjs/**'),
    // keep Alloy editor assets
    '!' + dist('bower_components/alloyeditor'),
    '!' + dist('bower_components/alloyeditor/dist'),
    '!' + dist('bower_components/alloyeditor/dist/alloy-editor'),
    '!' + dist('bower_components/alloyeditor/dist/alloy-editor/assets'),
    '!' + dist('bower_components/alloyeditor/dist/alloy-editor/assets/**'),
  ]);
});

// merge message files from nuxeo-ui-elements and nuxeo-web-ui
// in case of conflict, nuxeo-web-ui prevails
gulp.task('merge-message-files', function() {
  var i18ndist = app('i18n');
  return gulp.src([dist('bower_components/nuxeo-ui-elements/i18n/messages*.json')])
      .pipe($.if(function(file) {
        return fs.existsSync(path.join(i18ndist, path.basename(file.path)));
      }, through.obj(function(file, enc, callback) {
        gulp.src([file.path, path.join(i18ndist, path.basename(file.path))])
            .pipe(mergeJson(path.basename(file.path)))
            .pipe(gulp.dest(i18ndist));
        callback();
      })))
      .pipe(gulp.dest(i18ndist))
      .pipe($.size({title: 'merge-message-files'}));
});

// Clean output directory
gulp.task('clean', function() {
  return del(['.tmp']);
});

// Build production files, the default task
gulp.task('default', ['clean'], function(cb) {
  runSequence(
      'merge-message-files',
      ['copy', 'styles'],
      'fixSelect2',
      ['images', 'html'],
      'vulcanize',
      'move-layouts',
      'strip',
      cb);
});
