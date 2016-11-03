'use strict';

import gulp from 'gulp';
import babel from 'gulp-babel';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import eslint from 'gulp-eslint';
import mocha from 'gulp-spawn-mocha';
import babelify from 'babelify';
import { Server } from 'karma';
import gulpSequence from 'gulp-sequence';
import nsp from 'gulp-nsp';
import replace from 'gulp-replace';
import fs from'fs';
import path from 'path';
import pkg from './package.json';
import del from 'del';

gulp.task('default', ['build'], () => {
});

gulp.task('lint', () => {
  return gulp.src(['src/**', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('clean:lib', () => {
  return del([
    'lib',
  ]);
});

gulp.task('clean:dist', () => {
  return del([
    'dist',
  ]);
});

gulp.task('build:node', ['clean:lib', 'lint'], () => {
  return gulp.src('src/**')
    .pipe(replace('__VERSION__', pkg.version))
    .pipe(babel())
    .pipe(gulp.dest('lib'));
});

gulp.task('build:browser', ['clean:dist', 'lint'], () => {
  return browserify({
    entries: 'src/index.js',
    standalone: 'Nuxeo',
  })
  .transform('browserify-versionify', {
    placeholder: '__VERSION__',
    version: pkg.version,
  })
  .transform(babelify)
  .bundle()
  .pipe(source('nuxeo.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('build', gulpSequence(['build:node', 'build:browser']));

gulp.task('test:node', ['build:node'], () => {
  return gulp.src('test/**/*.spec.js')
    .pipe(mocha({
      require: ['./test/helpers/setup.js', './test/helpers/setup-node.js'],
      compilers: 'js:babel-core/register',
      timeout: 30000,
    }));
});

gulp.task('test:browser', ['build:browser'], (done) => {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
  }, (exitStatus) => done(exitStatus ? 'Browser tests failed' : undefined)).start();
});

gulp.task('test', gulpSequence('test:node', 'test:browser'));

gulp.task('checkstyle', () => {
  const targetFolder = 'ftest/target';
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  return gulp.src(['src/**', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format('checkstyle', fs.createWriteStream(path.join(targetFolder, '/checkstyle-result.xml'))));
});

gulp.task('it:node', ['build:node'], () => {
  return gulp.src('test/**/*.spec.js')
    .pipe(mocha({
      require: ['./test/helpers/setup.js', './test/helpers/setup-node.js'],
      compilers: 'js:babel-core/register',
      reporter: 'mocha-jenkins-reporter',
      reporterOptions: 'junit_report_path=./ftest/target/js-reports/test-results-node.xml,junit_report_stack=1',
      timeout: 30000,
    }))
    .on('error', () => {
      /* eslint no-console: 0 */
      console.error('Node.js tests failed');
    });
});

gulp.task('it:browser', ['build:browser'], (done) => {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
    reporters: ['junit', 'spec'],
    junitReporter: {
      outputDir: './ftest/target/js-reports/',
      useBrowserName: true,
    },
  }, (exitStatus) => done(exitStatus ? 'Browser tests failed' : undefined)).start();
});

gulp.task('it', () => {
  gulpSequence('checkstyle', 'it:node', 'it:browser', () => {
    // always return 0 status code for frontend-maven-plugin
    return process.exit(0);
  });
});

gulp.task('prepublish', ['nsp', 'test']);

gulp.task('nsp', (done) => {
  nsp({
    shrinkwrap: __dirname + '/npm-shrinkwrap.json',
    package: __dirname + '/package.json',
  }, done);
});
