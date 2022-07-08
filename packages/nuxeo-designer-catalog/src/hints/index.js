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
const jsonStream = require('JSONStream');
const through = require('through2');
const gutil = require('gulp-util');
const _ = require('lodash');
const htmlGenerator = require('./generators/html-hint-generator');
const polymerGenerator = require('./generators/polymer-hint-generator');
const behaviorGenerator = require('./generators/polymer-behavior-hint-generator');

const hints = {
  html: {
    '!top': 'template',
    template: {
      children: [],
    },
  },
  polymer: {
    elements: {},
    behaviors: {},
  },
};

/**
 * Generate hints for the CodeMirror plugins.
 */
module.exports = (catalog, base) =>
  // create the stream for reading the catalog
  fs
    .createReadStream(catalog)
    // stream for accessing the elements
    .pipe(jsonStream.parse('elements.*'))
    // generate the hints
    .pipe(
      through.obj(
        (element, enc, cb) => {
          // get the element path and generate the hints
          const path = `${base}${element.name}.json`;

          // skip element hints for behaviors
          // generate polymer hints for the element, behaviors
          let elementHints = polymerGenerator(path);
          const behaviorHints = behaviorGenerator(path);

          // if the element is a behavior only add the behavior hints
          if (element.name.toLowerCase().includes('behavior')) {
            Object.assign(hints.polymer.behaviors, elementHints);
            Object.assign(hints.polymer.behaviors, behaviorHints);
          } else {
            Object.assign(hints.polymer.elements, elementHints);
            Object.assign(hints.polymer.behaviors, behaviorHints);

            // generate html hints for the elements
            elementHints = htmlGenerator(path);
            // save the hints
            hints.html.template.children = _.uniq(hints.html.template.children.concat(Object.keys(elementHints)));
            Object.assign(hints.html, elementHints);
          }

          cb();
        },
        function flush(cb) {
          // push the hints into a new stream
          this.push(
            new gutil.File({
              cwd: '',
              base: '',
              path: 'nuxeo-cm-hints-def.json',
              contents: Buffer.from(JSON.stringify(hints)),
            }),
          );
          cb();
        },
      ),
    );
