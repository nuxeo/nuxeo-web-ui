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
  const hints = {};
  const { behaviors } = JSON.parse(fs.readFileSync(path));

  behaviors.forEach((behavior) => {
    const behaviorHints = {};
    if (behavior.type === 'behavior') {
      const { properties } = behavior;
      properties.forEach((property) => {
        const { name } = property;
        const doc = typeof property.desc !== 'undefined' ? property.desc : null;
        if (!property.private) {
          if (property.function) {
            if (property.params && property.params.length > 0) {
              const params = property.params.map((param) => param.name);
              behaviorHints[name] = {
                '!type': `fn(${params.join(', ')})`,
                '!doc': doc,
              };
            } else {
              behaviorHints[name] = {
                '!type': 'fn()',
                '!doc': doc,
              };
            }
          } else if (property.type === 'Number') {
            behaviorHints[name] = {
              '!type': 'number',
              '!doc': doc,
            };
          } else if (property.type === 'Boolean') {
            behaviorHints[name] = {
              '!type': '',
              '!doc': doc,
            };
          } else if (property.type === 'String') {
            behaviorHints[name] = {
              '!type': 'string',
              '!doc': doc,
            };
          } else if (property.type === 'Array') {
            behaviorHints[name] = {
              '!type': '[]',
              '!doc': doc,
            };
          } else {
            behaviorHints[name] = {
              '!type': 'object',
              '!doc': doc,
            };
          }
        }
      });
    }
    hints[behavior.is] = {
      prototype: {},
    };
    Object.assign(hints[behavior.is].prototype, behaviorHints);
  });
  return hints;
};
