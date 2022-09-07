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
const fs = require('fs-extra');
const gutil = require('gulp-util');
const path = require('path');

const _ = require('lodash');
const async = require('async');

const stream = require('./utils/stream').obj;
const packageDetails = require('./utils/package-details');
const analyze = require('./utils/analyze');
const cleanTags = require('./utils/clean-tags');

function _parseElements(pkg, sourcePaths, packageDependencies, pkgManagement, destDir, root, libraries, done) {
  analyze(pkg, sourcePaths, libraries, pkgManagement, (err, packageData) => {
    let elements = packageData.elements.concat(packageData.behaviors);

    const filtered = packageDependencies.elements || pkg.elements;
    if (filtered) {
      elements = elements.filter((el) => filtered.indexOf(el.is) !== -1);
    }

    gutil.log(`Generated catalog with ${elements.length} elements.`);

    async.map(
      elements,
      (element, cb) => {
        const elementName = element.is;
        // write element info
        const out = { elements: [element], elementsByTagName: {}, behaviors: [], features: [] };
        out.elementsByTagName[element.is] = element;

        if (element.behaviors) {
          out.behaviors = packageData.behaviors.filter((behavior) => element.behaviors.indexOf(behavior.is) !== -1);
        }

        gutil.log(`- ${elementName}`);

        fs.writeFileSync(path.join(destDir, 'data', 'docs', `${elementName}.json`), JSON.stringify(out));

        let description;
        let active;
        let demo;
        let hero;
        if (element.desc) {
          const lines = element.desc.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i]) {
              description = lines[i];
              break;
            }
          }
        }

        if (element.demos) {
          active = elementName;
          demo = (element.demos || [])[0] || null;
        }

        if (element.hero) {
          const base = path.dirname(path.relative(root, element.contentHref));
          hero = path.join(base, element.hero);
        }

        let parentPackage = _.find(libraries, (lib) => element.contentHref.indexOf(lib.name) >= 0);

        parentPackage =
          parentPackage || _.find(libraries, (lib) => element.contentHref.indexOf(lib.group) >= 0 && lib.isLibrary);

        cb(err, {
          name: elementName,
          version: packageDependencies._release,
          source: packageDependencies._originalSource,
          target: packageDependencies._target,
          package: parentPackage ? parentPackage.name : pkg.name,
          path: element.path,
          description,
          tags: (packageDependencies.keywords || []).filter(cleanTags),
          hero,
          demo,
          active,
          behaviors: element.behaviors || [],
        });
      },
      (error, output) => {
        done(error, output);
      },
    );
  });
}

module.exports = (imports) => {
  const { application, destDir, pkgManagement, root } = imports;
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const dependenciesFile = require(path.join(root, pkgManagement === 'npm' ? 'package.json' : 'bower.json'));
  const deps = dependenciesFile.dependencies;
  // inject the application itself to retrieve its own dependencies
  deps[application] = `${imports.url}#${imports.branch}`;
  const data = [];
  const libraries = imports.packages.packages
    .filter((pkg) => !pkg.isApplication)
    .map((pkg) => {
      return {
        name: pkg.name,
        group: pkg.name.substr(0, pkg.name.indexOf('-')),
        isLibrary: pkg.isLibrary || false,
      };
    });

  return stream.compose(
    stream.parse('packages.*'),
    stream.filter((pkg) => pkg.isApplication),
    stream.asyncMap((pkg, done) => {
      const packageDependencies = packageDetails({
        root,
        name: pkg.name,
      });

      fs.mkdirsSync(path.join(destDir, 'data', 'docs'));

      const sourcePaths = pkg.sourcePaths.map((sourcePath) => path.join(root, sourcePath));
      _parseElements(pkg, sourcePaths, packageDependencies, pkgManagement, destDir, root, libraries, done);
    }),

    // Convert to objects from arrays (and flatten),
    // and sort
    stream.create(
      (chunk, enc, done) => {
        data.push(chunk);
        done();
      },
      function(done) {
        const sortedData = _(data)
          .flatten()
          .sortBy('name')
          .value();
        this.push(sortedData);
        done();
      },
    ),
  );
};
