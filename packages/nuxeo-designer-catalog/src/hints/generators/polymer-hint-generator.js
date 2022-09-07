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

module.exports = (path) => {
  const elementHints = {};
  const { elements } = JSON.parse(fs.readFileSync(path));
  if (typeof elements === 'undefined') {
    return elementHints;
  }
  elements.forEach((element) => {
    const hint = {};
    hint.doc = typeof element.desc !== 'undefined' ? element.desc : null;
    element.properties.forEach((property) => {
      const { name } = property;
      const doc = typeof property.desc !== 'undefined' ? property.desc : null;
      if (!property.private) {
        if (property.function) {
          if (Array.isArray(property.params) && property.params.length > 0) {
            const params = property.params.map((param) => param.name);
            hint[name] = {
              '!type': `fn(${params.join(', ')})`,
              '!doc': doc,
            };
          } else {
            hint[name] = {
              '!type': 'fn()',
              '!doc': doc,
            };
          }
        } else if (property.type === 'Number') {
          hint[name] = {
            '!type': 'number',
            '!doc': doc,
          };
        } else if (property.type === 'Boolean') {
          hint[name] = {
            '!type': 'bool',
            '!doc': doc,
          };
        } else if (property.type === 'String' || property.type.indexOf('String') !== -1) {
          hint[name] = {
            '!type': 'string',
            '!doc': doc,
          };
        } else if (property.type === 'Array') {
          hint[name] = {
            '!type': '[]',
            '!doc': doc,
          };
        } else {
          hint[name] = {
            '!type': 'object',
            '!doc': doc,
          };
        }
      }
    });
    elementHints[element.is] = hint;
  });
  return elementHints;
};
