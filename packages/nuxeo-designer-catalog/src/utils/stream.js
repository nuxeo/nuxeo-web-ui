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
const concat = require('concat-stream');
const reduce = require('through2-reduce');
const asyncMap = require('through2-asyncmap');
const filter = require('through2-filter');
const map = require('through2-map');
const through = require('through2');
const jsonStream = require('JSONStream');
const isStream = require('is-stream');
const split = require('split');
const writeStreamP = require('writestreamp');
const pumpify = require('pumpify');
const from = require('from2');
const concurrent = require('through2-concurrent');
const eos = require('end-of-stream');

exports.create = through;
exports.split = split;
exports.writeFile = writeStreamP;
exports.from = from;
exports.concurrent = concurrent;
exports.onEnd = eos;

exports.parse = jsonStream.parse.bind(jsonStream);
exports.stringify = jsonStream.stringify.bind(jsonStream);
exports.stringify.obj = jsonStream.stringifyObject = (options) => {
  options = options || {};

  return through.obj((chunk, enc, done) => {
    done(null, JSON.stringify(chunk, null, options.space));
  });
};
exports.validate = isStream;

exports.concat = concat;
exports.compose = pumpify;

exports.reduce = reduce;
reduce.obj = (fn) => reduce.call(null, { objectMode: true }, fn);
exports.filter = filter;
exports.map = map;
exports.asyncMap = asyncMap;

// Object mode
exports.obj = {
  create: exports.create.obj,
  split: exports.split.obj,
  writeFile: exports.writeFile,
  from: from.obj,
  concurrent: exports.concurrent.obj,
  onEnd: exports.onEnd,

  parse: exports.parse,
  stringify: exports.stringify.obj,
  validate: exports.validate,

  concat: exports.concat,
  compose: exports.compose.obj,

  reduce: exports.reduce.obj,
  filter: exports.filter.obj,
  map: exports.map.obj,
  asyncMap: exports.asyncMap.obj,
  get: (key) =>
    exports.obj.create((obj, enc, done) => {
      done(null, obj[key]);
    }),
};
