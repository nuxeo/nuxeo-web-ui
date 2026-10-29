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
import { assign, b64DecodeUnicode, hasProp, parseParams } from '../addons/nuxeo-spreadsheet/app/utils.js';

suite('nuxeo-spreadsheet utils', () => {
  suite('assign', () => {
    test('sets a top level property from a string path', () => {
      const obj = {};
      assign(obj, 'title', 'My file');
      expect(obj).to.deep.equal({ title: 'My file' });
    });

    test('accepts an already split path', () => {
      const obj = {};
      assign(obj, ['dc:title'], 'My file');
      expect(obj).to.deep.equal({ 'dc:title': 'My file' });
    });

    test('creates the missing intermediate objects of a nested path', () => {
      const obj = {};
      assign(obj, 'properties.dc:creator.id', 'jdoe');
      expect(obj).to.deep.equal({ properties: { 'dc:creator': { id: 'jdoe' } } });
    });

    test('keeps the existing siblings of an intermediate object', () => {
      const obj = { properties: { 'dc:title': 'My file' } };
      assign(obj, 'properties.dc:description', 'Some description');
      expect(obj.properties).to.deep.equal({ 'dc:title': 'My file', 'dc:description': 'Some description' });
    });

    test('replaces a non object intermediate value', () => {
      const obj = { properties: 'not an object' };
      assign(obj, 'properties.dc:title', 'My file');
      expect(obj).to.deep.equal({ properties: { 'dc:title': 'My file' } });
    });

    test('replaces an array intermediate value', () => {
      const obj = { properties: ['a', 'b'] };
      assign(obj, 'properties.dc:title', 'My file');
      expect(obj.properties).to.deep.equal({ 'dc:title': 'My file' });
    });
  });

  suite('hasProp', () => {
    test('is true for an own top level property', () => {
      expect(hasProp({ 'dc:title': 'My file' }, 'dc:title')).to.be.true;
    });

    test('is false for a missing top level property', () => {
      expect(hasProp({ 'dc:title': 'My file' }, 'dc:description')).to.be.false;
    });

    test('is false for an inherited property', () => {
      expect(hasProp({}, 'toString')).to.be.false;
    });

    test('is true for an own nested property', () => {
      expect(hasProp({ properties: { 'dc:title': 'My file' } }, 'properties.dc:title')).to.be.true;
    });

    test('is false for a missing nested property', () => {
      expect(hasProp({ properties: { 'dc:title': 'My file' } }, 'properties.dc:description')).to.be.false;
    });

    test('accepts an already split path', () => {
      expect(hasProp({ properties: { 'dc:title': 'My file' } }, ['properties', 'dc:title'])).to.be.true;
    });

    test('replaces a non object intermediate value and reports the leaf as missing', () => {
      const obj = { properties: 'not an object' };
      expect(hasProp(obj, 'properties.dc:title')).to.be.false;
      expect(obj.properties).to.deep.equal({});
    });
  });

  suite('parseParams', () => {
    // Reads window.location.search directly. history.replaceState swaps the query in place without
    // navigating, so the parsing loop runs for real instead of returning at the empty-query guard.
    const originalUrl = window.location.href;
    const withQuery = (query) => {
      window.history.replaceState(null, '', `${window.location.pathname}${query}`);
      return parseParams();
    };

    teardown(() => {
      window.history.replaceState(null, '', originalUrl);
    });

    test('returns an empty object when there is no query string', () => {
      expect(withQuery('')).to.deep.equal({});
    });

    test('parses each key/value pair of the query string', () => {
      expect(withQuery('?repo=default&size=40')).to.deep.equal({ repo: 'default', size: '40' });
    });

    test('decodes + as a space and percent-encoded characters', () => {
      expect(withQuery('?query=my+file&path=%2Fdefault-domain')).to.deep.equal({
        query: 'my file',
        path: '/default-domain',
      });
    });
  });

  suite('b64DecodeUnicode', () => {
    test('decodes plain ASCII', () => {
      expect(b64DecodeUnicode(btoa('My file'))).to.equal('My file');
    });

    test('decodes multi byte characters', () => {
      const encoded = btoa(String.fromCharCode(...new TextEncoder().encode('Fichier éàü')));
      expect(b64DecodeUnicode(encoded)).to.equal('Fichier éàü');
    });
  });
});
