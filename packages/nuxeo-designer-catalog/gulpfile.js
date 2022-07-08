/**
@license
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

// Include Gulp & tools we'll use
const gulp = require('gulp');
const gutil = require('gulp-util');
const git = require('gulp-git');
const del = require('del');
const { spawn } = require('child_process');
const runSequence = require('run-sequence');
const merge = require('merge-stream');
const path = require('path');
const bower = require('gulp-bower');
const fs = require('fs-extra');
const stream = require('./src/utils/stream').obj;
const hintsBuilder = require('./src/hints/index');
const catalogBuilder = require('./src/index');
const gitBranch = require('./src/utils/git-branch');

const webUiRepositoryUrl = 'https://github.com/nuxeo/nuxeo-web-ui.git';

function promiseSerial(funcs) {
  return funcs.reduce(
    (promise, func) => promise.then((result) => func().then(Array.prototype.concat.bind(result))),
    Promise.resolve([]),
  );
}

function execCatalogTask(options) {
  const { application } = options;
  const { destDir } = options;
  const { space } = options;
  const destFilepath = path.join(destDir, '/catalog.json');

  return catalogBuilder({
    application,
    src: options.catalogPath,
    destDir,
    root: options.root,
    url: options.url,
    branch: options.branch,
    pkgManagement: options.pkgManagement,
  })
    .pipe(stream.stringify({ space }))
    .pipe(stream.writeFile(destFilepath));
}

// Build nuxeo catalog
gulp.task('catalog', (cb) => {
  runSequence('clone-catalog', 'checkout-catalog', 'generate-catalog', 'cleanup-catalog', cb);
});

function getTargetPlatforms(base) {
  // check if a specific target platform was specified on the command line
  let tp;
  const i = process.argv.indexOf('--tp');
  if (i > -1) {
    tp = process.argv[i + 1];
    return [tp];
  }
  return fs.readdirSync(base).filter((file) => {
    const targetPlatformPath = path.join(base, file);
    return fs.lstatSync(targetPlatformPath).isDirectory();
  });
}

// prepare the catalog by cloning web-ui and copying necessary files
gulp.task('clone-catalog', (cb) => {
  const base = 'data/applications/nuxeo';
  const application = 'nuxeo-web-ui';
  const targetPlatforms = getTargetPlatforms(base);

  const applicationBase = path.join(base, application);
  if (fs.existsSync(applicationBase)) {
    fs.removeSync(applicationBase);
  }
  // clone the web-ui repository
  gutil.log('git clone nuxeo-web-ui repository');
  return git.clone(webUiRepositoryUrl, { quiet: true, cwd: base }, (err) => {
    if (err) {
      gutil.log(err);
      return;
    }
    // copy the web-ui checkout so we can checkout different branches/tags
    targetPlatforms.forEach((platform) => {
      const folder = path.join(base, platform, application);
      // if the checkout already exists, we must remove it first
      if (fs.existsSync(folder)) {
        fs.removeSync(folder);
      }
      fs.copySync(path.join(base, application), path.join(base, platform, application));
    });

    // remove the base folder
    fs.removeSync(path.join(base, application));
    gutil.log('git clone finished');
    cb(err);
  });
});

gulp.task('checkout-catalog', () => {
  const base = 'data/applications/nuxeo';
  const application = 'nuxeo-web-ui';
  const targetPlatforms = getTargetPlatforms(base);

  // check if a specific branch or tag was specified on the command line
  let branch;
  const i = process.argv.indexOf('--webui-branch');
  if (i > -1) {
    branch = process.argv[i + 1];
  }

  return Promise.all(
    targetPlatforms.map(
      (platform) =>
        new Promise((resolve, reject) => {
          gutil.log('git checkout nuxeo-web-ui ', platform);
          const folder = path.join(base, platform, application);
          const version = branch || platform;
          git.checkout(version, { quiet: true, cwd: folder }, (err) => {
            if (err) {
              gutil.log(err);
              reject();
            }

            // remove all git related files, except the HEAD file (useful to get the branch of the checkout)
            del([
              path.join(folder, '.git', '*'),
              `!${path.join(folder, '.git', 'HEAD')}`,
              path.join(folder, '.gitignore'),
            ]);

            gutil.log('git checkout finished for nuxeo-web-ui ', platform);
            resolve();
          });
        }),
    ),
  );
});

gulp.task('generate-catalog', () => {
  const base = 'data/applications/nuxeo';
  const application = 'nuxeo-web-ui';
  const targetPlatforms = getTargetPlatforms(base);

  const catalogGenerators = targetPlatforms.map(
    (platform) =>
      function() {
        return new Promise((resolve, reject) => {
          // callback to generate the catalog
          const catalogCallback = (pkgManager) =>
            function() {
              gutil.log('generate catalog for nuxeo-web-ui ', platform);
              execCatalogTask({
                application,
                destDir: path.join(base, platform),
                space: 2,
                catalogPath: path.join(base, platform, '/catalog-packages.json'),
                root: path.join(base, platform, application),
                url: webUiRepositoryUrl,
                branch: gitBranch(path.join(base, platform, application)),
                pkgManagement: pkgManager,
              })
                .on('error', reject)
                .on('finish', resolve);
            };

          const webuiBase = path.join(base, platform, application);
          // decide if we should use bower or npm
          if (fs.existsSync(path.join(webuiBase, 'bower.json'))) {
            gutil.log('bower install for nuxeo-web-ui ', platform);
            bower({ cwd: webuiBase, verbosity: 1 }).on('end', catalogCallback('bower'));
          } else {
            gutil.log('npm install for nuxeo-web-ui');
            // use absolute path for webui to run npm install
            const npmInstall = spawn('npm', ['install'], {
              cwd: path.join(process.cwd(), webuiBase),
              stdio: 'inherit',
            });
            npmInstall.on('exit', () => catalogCallback('npm')());
          }
        });
      },
  );
  return promiseSerial(catalogGenerators);
});

gulp.task('cleanup-catalog', () => {
  const base = path.resolve(__dirname, 'data/applications/nuxeo');
  const application = 'nuxeo-web-ui';
  const targetPlatforms = getTargetPlatforms(base);

  const catalogCleanUp = targetPlatforms.map(
    (platform) =>
      function() {
        return new Promise((resolve) => {
          gutil.log('clean up catalog files for nuxeo-web-ui ', platform);
          const appBase = path.join(base, platform, application);
          const npmManagement = !fs.existsSync(path.join(appBase, 'bower.json'));
          const dependencies = path.join(appBase, npmManagement ? 'node_modules' : 'bower_components');

          // remove unnecessary dependencies
          ['polymer-cli', 'alloyeditor', 'Chart.js', 'hydrolysis', 'aws-sdk'].forEach((name) => {
            fs.removeSync(path.join(dependencies, name));
          });

          /**
           * in newer versions, we can rely in the importMap to decide what we want to keep.
           * If is it not mapped by the importMap, then we don't need to keep those files.
           */
          fs.removeSync(path.join(appBase, 'packages'));
          const importMapPath = path.join(base, platform, 'importMap.json');
          if (fs.existsSync(importMapPath)) {
            // eslint-disable-next-line global-require, import/no-dynamic-require
            const importMap = require(importMapPath);
            // decide which folders to keep
            const foldersToKeep = Object.keys(importMap.imports).map((packageName) =>
              path.join(dependencies, packageName.split(path.sep)[0]),
            );

            // delete the dependencies that are not required by the importMap
            fs.readdirSync(dependencies).forEach((name) => {
              if (foldersToKeep.indexOf(path.join(dependencies, name)) < 0) {
                fs.removeSync(path.join(dependencies, name));
              }
            });
          }

          resolve();
        });
      },
  );
  return promiseSerial(catalogCleanUp);
});

// Build hints for the HTML editor from catalog
gulp.task('hints', () => {
  const base = 'data/applications/nuxeo';
  const targetPlatforms = getTargetPlatforms(base);
  return merge(
    targetPlatforms.map((platform) => {
      const platformBase = `data/applications/nuxeo/${platform}`;
      return hintsBuilder(`${platformBase}/catalog.json`, `${platformBase}/data/docs/`).pipe(
        gulp.dest(`${platformBase}/hints`),
      );
    }),
  );
});
