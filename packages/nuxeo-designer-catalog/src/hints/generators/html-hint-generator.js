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
const decamelize = require('decamelize');

module.exports = (path) => {
  const elementHints = {};
  const { elements } = JSON.parse(fs.readFileSync(path));
  if (typeof elements === 'undefined') {
    return elementHints;
  }
  elements.forEach((element) => {
    const hint = {};
    hint.doc = typeof element.desc !== 'undefined' ? element.desc : null;
    hint.attrs = {};
    hint.children = [];
    element.properties.forEach((property) => {
      const name = decamelize(property.name, '-');
      if (!property.private && !property.function) {
        const desc = typeof property.desc !== 'undefined' ? property.desc : null;
        let defaultValues = null;
        if (property.type === 'Boolean') {
          defaultValues = ['true', 'false'];
        }
        hint.attrs[name] = {
          default: defaultValues,
          doc: desc,
        };
      }
    });
    elementHints[element.is] = hint;
  });
  return elementHints;
};
