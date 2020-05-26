/*
 * (C) Copyright 2020 Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Contributors:
 *     Nelson Silva <nsilva@nuxeo.com>
 */

export function parseParams() {
  const parameters = {};
  const query = window.location.search.replace('?', '');
  if (query.length === 0) {
    return parameters;
  }
  const params = query.split('&');
  for (const param of params) {
    // eslint-disable-next-line prefer-const
    let [k, v] = param.split('=');
    v = v.replace(/\+/g, ' ');
    parameters[k] = decodeURIComponent(v);
  }
  return parameters;
}

// see https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
export function b64DecodeUnicode(str) {
  return decodeURIComponent(
    atob(str)
      .split('')
      .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join(''),
  );
}

// Property Utils

// http://stackoverflow.com/questions/13719593/javascript-how-to-set-object-property-given-its-string-name
export function assign(obj, prop, value) {
  if (typeof prop === 'string') {
    prop = prop.split('.');
  }

  if (prop.length > 1) {
    const e = prop.shift();
    assign((obj[e] = Object.prototype.toString.call(obj[e]) === '[object Object]' ? obj[e] : {}), prop, value);
  } else {
    obj[prop[0]] = value;
  }
}

export function hasProp(obj, prop) {
  if (typeof prop === 'string') {
    prop = prop.split('.');
  }

  if (prop.length > 1) {
    const e = prop.shift();
    return hasProp((obj[e] = Object.prototype.toString.call(obj[e]) === '[object Object]' ? obj[e] : {}), prop);
  }
  // eslint-disable-next-line no-prototype-builtins
  return obj.hasOwnProperty(prop[0]);
}
