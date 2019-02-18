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
var merge = require('merge-stream');
var path = require('path');
var fs = require('fs');
var through = require('through2');
var mergeJson = require('gulp-merge-json');
var mergeStream = require('merge-stream');
var cssSlam = require('css-slam').gulp;
var htmlMinifier = require('gulp-html-minifier');
var polymer = require('polymer-build');
var polyserve = require('polyserve');
var log = require('fancy-log');

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
      .pipe($.eslint())
      .pipe($.eslint.format())
      .pipe($.eslint.failAfterError());
});

// merge message files from nuxeo-ui-elements and nuxeo-web-ui
// in case of conflict, nuxeo-web-ui prevails
gulp.task('merge-message-files', function() {
  var i18ndist = dist('i18n');
  var i18ntmp = '.tmp/i18n';
  return gulp.src(['node_modules/@nuxeo/nuxeo-ui-elements/i18n/messages*.json'])
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
      .pipe($.if(/\.css$/, cssSlam())) // Install css-slam to use
      .pipe($.if(/\.html$/, htmlMinifier())) // Install gulp-html-minifier to use
      .pipe(htmlSplitter.rejoin()) // Call rejoin when you're finished
      .pipe(project.bundler({
        sourcemaps: true,
        stripComments: true,
        inlineCss: true,
        inlineScripts: true,
        excludes: [dist('elements/nuxeo-search-page.html')],
      }))
      .pipe(gulp.dest(DIST))
      .on('end', resolve)
      .on('error', reject);
  });
});

// copy workbox libraries to <dist>/workbox
gulp.task('workbox-sw', function() {
  var workboxBuild = require('workbox-build');
  return workboxBuild.copyWorkboxLibraries(dist()).then(function(dir) {
    del.sync(dist('workbox'));
    fs.renameSync(dist(dir), dist('workbox'));
  });
});

// Move from 'elements' folder to root
gulp.task('move-elements', function() {
  // copy user-group-management layouts
  var userGroupManagement = gulp.src([
    dist('node_modules/@nuxeo/nuxeo-ui-elements/nuxeo-user-group-management/nuxeo-view-user.html'),
    dist('node_modules/@nuxeo/nuxeo-ui-elements/nuxeo-user-group-management/nuxeo-edit-user.html')])
    .pipe(gulp.dest(dist('nuxeo-user-group-management')));

  // copy diff elements
  var diff = gulp.src(
    dist('elements/diff/**'))
    .pipe(gulp.dest(dist('diff')));

  var layouts = gulp.src([
    dist('elements/document/**'), '!' + dist('elements/document/*.html'),
    dist('elements/directory/**'), '!' + dist('elements/directory/*.html'),
    dist('elements/search/**'), '!' + dist('elements/search/*.html'),
    dist('elements/workflow/**'), '!' + dist('elements/workflow/*.html'),
    dist('elements/nuxeo-*.html'), '!' + dist('elements/nuxeo-app.html'),
  ], {base: dist('elements')}).pipe(gulp.dest(dist()));

  // fix asset path
  var elements = gulp.src([
    dist('elements/nuxeo-app.js'),
    dist('elements/elements.js'),
    dist('elements/routing.js')])
    .pipe($.replace('..\/fonts\/', './fonts/'))
    .pipe(gulp.dest(dist()));


  return merge(elements, layouts, userGroupManagement, diff);
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
      'move-elements',
      'workbox-sw',
      'strip',
      cb);
});

// Watch files for changes & reload
gulp.task('serve', ['merge-message-files'], function() {

  var options = {
    hostname: '0.0.0.0',
    port: 5000,
    proxy: {
      path: '/nuxeo',
      target: 'http://localhost:8080/nuxeo'
    },
    /* global Map */
    additionalRoutes: new Map([
      ['/*', require('express').static('.tmp')]
    ]),
    npm: true,
    moduleResolution: 'node'
  };

  polyserve.startServers(options).then(function(serverInfos) {
    var urls = polyserve.getServerUrls(options, serverInfos.server);
    log('Web UI running at ' + require('url').format(urls.serverUrl));
  });

  // gulp.watch(['{scripts,elements}/**/{*.js,*.html}'], ['lint']);
  gulp.watch(['i18n/**/*'], ['merge-message-files']);
});
