/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

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

/**
 * Returns the branch of the repository checkout located in `repositoryPath`.
 * The `.git/HEAD` file is read and parsed to get the branch name.
 */
module.exports = (repositoryPath) => {
  const headFilePath = path.join(repositoryPath, '.git', 'HEAD');
  const match = /ref: refs\/heads\/([^\n]+)/.exec(fs.readFileSync(headFilePath, 'utf8'));
  return match ? match[1] : null;
};
