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
const fs = require('fs');
const path = require('path');

const packages = require('./packages');
const elements = require('./elements');
const objectFromStreams = require('./utils/object-from-streams');

module.exports = (options) => {
  const srcFilepath = options.src;
  const destDir = path.resolve(__dirname, '../', options.destDir);
  const { application } = options;

  const root = path.resolve(__dirname, '../', options.root);
  const { url } = options;
  const { branch } = options;
  const srcCatalog = fs.createReadStream(srcFilepath);

  const srcPackagesFile = path.resolve(__dirname, '../', srcFilepath);
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const srcPackages = require(srcPackagesFile);
  const { pkgManagement } = options;

  const elementsStream = srcCatalog.pipe(
    elements({ root, destDir, application, packages: srcPackages, pkgManagement, url, branch }),
  );
  return objectFromStreams({
    packages: srcCatalog.pipe(
      packages({
        root,
        destDir,
      }),
    ),
    elements: elementsStream,
  });
};
