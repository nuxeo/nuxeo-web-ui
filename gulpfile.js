/*
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

// Include Gulp & tools we'll use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var merge = require('merge-stream');
var path = require('path');
var fs = require('fs');
var through = require('through2');
var mergeJson = require('gulp-merge-json');
var mergeStream = require('merge-stream');
var cssSlam = require('css-slam').gulp;
var htmlMinifier = require('gulp-html-minifier');
var polymer = require('@nuxeo/polymer-build');
var babel = require('gulp-babel');
var babelPresetES2015 = require('babel-preset-es2015').buildPreset({}, {modules: false});

var DIST = 'target/classes/web/nuxeo.war/ui';

var dist = function(subpath) {
  return !subpath ? DIST : path.join(DIST, subpath);
};

// Lint JavaScript
gulp.task('lint', function() {
  return gulp.src([
    'elements/**/*.js',
    'elements/**/*.html',
    'gulpfile.js'
  ])
      .pipe(reload({
        stream: true,
        once: true
      }))

      .pipe($.eslint())
      .pipe($.eslint.format())
      .pipe($.eslint.failAfterError());
});

// merge message files from nuxeo-ui-elements and nuxeo-web-ui
// in case of conflict, nuxeo-web-ui prevails
gulp.task('merge-message-files', function() {
  var i18ndist = dist('i18n');
  var i18ntmp = '.tmp/i18n';
  return gulp.src(['bower_components/nuxeo-ui-elements/i18n/messages*.json'])
             .pipe($.if(function(file) {
               return fs.existsSync(path.join('i18n', path.basename(file.path)));
             }, through.obj(function(file, enc, callback) {
               gulp.src([file.path, path.join('i18n', path.basename(file.path))])
                   .pipe(mergeJson(path.basename(file.path)))
                   .pipe(gulp.dest(i18ntmp))
                   .pipe(gulp.dest(i18ndist));
               callback();
             })))
             .pipe(gulp.dest(i18ntmp))
             .pipe(gulp.dest(i18ndist))
             .pipe($.size({title: 'merge-message-files'}));
});

gulp.task('polymer-build', function() {

  var project = new polymer.PolymerProject('./polymer.json');

  var htmlSplitter = new polymer.HtmlSplitter();

  var sources = project.sources();

  var dependencies = project.dependencies();

  return new Promise(function(resolve, reject) {
    mergeStream(sources, dependencies)
      .pipe($.if('**/*.{png,gif,jpg,svg}', $.imagemin()))

      // pull any inline styles and scripts out of their HTML files and
      // into separate CSS and JS files in the build stream.
      .pipe(htmlSplitter.split())
      .pipe($.if(/\.js$/, babel({
        presets: babelPresetES2015,
        compact: false,
        ignore: 'custom-elements-es5-adapter.js,webcomponents-*.js'})))
      .pipe($.if(/\.css$/, cssSlam())) // Install css-slam to use
      .pipe($.if(/\.html$/, htmlMinifier())) // Install gulp-html-minifier to use
      .pipe(htmlSplitter.rejoin()) // Call rejoin when you're finished

      .pipe(project.bundler({
        rewriteUrlsInTemplates: true,
        stripComments: true,
        inlineCss: true,
        inlineScripts: true,
        excludes: [dist('elements/nuxeo-search-page.html')]
      }))
      .pipe(project.addCustomElementsEs5Adapter())
      .pipe(gulp.dest(DIST))
      .on('end', resolve)
      .on('error', reject);
  });
});


gulp.task('babel-helpers', function() {
  return gulp.src(['node_modules/@nuxeo/polymer-build/lib/babel-helpers.min.js']).pipe(gulp.dest(dist('scripts')));
});

// Move from 'elements' folder to root
gulp.task('move-elements', function() {
  // copy user-group-management layouts
  var userGroupManagement = gulp.src([
    dist('bower_components/nuxeo-ui-elements/nuxeo-user-group-management/nuxeo-view-user.html'),
    dist('bower_components/nuxeo-ui-elements/nuxeo-user-group-management/nuxeo-edit-user.html')])
    .pipe(gulp.dest(dist('nuxeo-user-group-management')));

  var layouts = gulp.src([
    dist('elements/document/**'), '!' + dist('elements/document/*.html'),
    dist('elements/directory/**'), '!' + dist('elements/directory/*.html'),
    dist('elements/search/**'), '!' + dist('elements/search/*.html'),
    dist('elements/workflow/**'), '!' + dist('elements/workflow/*.html'),
    dist('elements/nuxeo-*.html')
  ], {base: dist('elements')}).pipe(gulp.dest(dist()));

  // fix asset path
  var elements = gulp.src(dist('elements/elements.html'))
    .pipe($.replace('..\/bower_components', 'bower_components'))
    .pipe(gulp.dest(dist()));

  return merge(elements, layouts, userGroupManagement);
});

// Strip unnecessary stuff
gulp.task('strip', function() {
  return del([
    dist('index.html'), // use our JSP
    dist('elements')
  ]);
});

// Clean output directory
gulp.task('clean', function() {
  return del(['.tmp']);
});

// Build production files
gulp.task('build', ['clean'], function(cb) {
  return runSequence(
      'merge-message-files',
      'polymer-build',
      'babel-helpers',
      'move-elements',
      'strip',
      cb);
});

// Watch files for changes & reload
gulp.task('serve', ['lint', 'merge-message-files'], function() {
  // setup our local proxy
  var proxyOptions = require('url').parse('http://localhost:8080/nuxeo');
  proxyOptions.route = '/nuxeo';
  browserSync({
    port: 5000,
    notify: false,
    logPrefix: 'WEBUI',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function(snippet) {
          return snippet;
        }
      }
    },
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: ['.tmp', '.'],
      middleware: [require('proxy-middleware')(proxyOptions)]
    }
  });

  gulp.watch(['**/*.html'], reload);
  gulp.watch(['styles/**/*.css'], ['styles', reload]);
  gulp.watch(['elements/**/*.css'], ['elements', reload]);
  gulp.watch(['{scripts,elements}/**/{*.js,*.html}'], ['lint']);
  gulp.watch(['images/**/*'], reload);
  gulp.watch(['i18n/**/*'], ['merge-message-files', reload]);
});

