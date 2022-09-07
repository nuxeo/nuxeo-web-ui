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
const _ = require('lodash');
const asyncEach = require('async-each');

const stream = require('./stream').obj;

module.exports = (spec) => {
  const objectStream = stream.create();

  asyncEach(
    Object.keys(spec),
    (key, done) => {
      if (stream.validate(spec[key])) {
        spec[key].pipe(
          stream.concat((data) => {
            const obj = {};
            obj[key] = data;
            objectStream.push(obj);

            done();
          }),
        );
      } else if (typeof spec[key] === 'object' && spec[key].onArray && stream.validate(spec[key].data)) {
        spec[key].data.pipe(
          stream.concat((data) => {
            const obj = {};
            obj[key] = spec[key].onArray(data);
            objectStream.push(obj);

            done();
          }),
        );
      } else {
        const obj = {};
        obj[key] = spec[key];
        objectStream.push(obj);
        done();
      }
    },
    () => {
      objectStream.end();
    },
  );

  // It might be could to split it by key?
  return objectStream.pipe(stream.reduce(_.extend));
};
