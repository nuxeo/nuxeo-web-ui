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
import { Diff } from '../elements/diff/nuxeo-object-diff.js';

suite('nuxeo-object-diff (Diff registry)', () => {
  setup(() => {
    delete Diff.registry.types;
    delete Diff.registry.properties;
    Diff.registry.default = 'nuxeo-default-diff';
  });

  suite('Diff.registerElement', () => {
    test('should register element by type', () => {
      Diff.registerElement('nuxeo-blob-diff', { type: 'blob' });
      expect(Diff.registry.types.blob).to.equal('nuxeo-blob-diff');
    });

    test('should register element by property', () => {
      Diff.registerElement('nuxeo-date-diff', { property: 'dc:created' });
      expect(Diff.registry.properties['dc:created']).to.equal('nuxeo-date-diff');
    });

    test('should register by both type and property', () => {
      Diff.registerElement('nuxeo-complex-diff', { type: 'complex', property: 'dc:complex' });
      expect(Diff.registry.types.complex).to.equal('nuxeo-complex-diff');
      expect(Diff.registry.properties['dc:complex']).to.equal('nuxeo-complex-diff');
    });
  });

  suite('Diff.getElement', () => {
    test('should return default when no registrations', () => {
      expect(Diff.getElement({ type: 'string' })).to.equal('nuxeo-default-diff');
    });

    test('should return type-registered element', () => {
      Diff.registerElement('nuxeo-blob-diff', { type: 'blob' });
      expect(Diff.getElement({ type: 'blob' })).to.equal('nuxeo-blob-diff');
    });

    test('should return property-registered element', () => {
      Diff.registerElement('nuxeo-date-diff', { property: 'dc:created' });
      expect(Diff.getElement({ property: 'dc:created' })).to.equal('nuxeo-date-diff');
    });

    test('should prefer property over type', () => {
      Diff.registerElement('nuxeo-type-diff', { type: 'string' });
      Diff.registerElement('nuxeo-prop-diff', { property: 'dc:title' });
      expect(Diff.getElement({ type: 'string', property: 'dc:title' })).to.equal('nuxeo-prop-diff');
    });

    test('should fall back to type when property is not registered', () => {
      Diff.registerElement('nuxeo-type-diff', { type: 'string' });
      expect(Diff.getElement({ type: 'string', property: 'dc:unknown' })).to.equal('nuxeo-type-diff');
    });

    test('should return default when neither type nor property match', () => {
      Diff.registerElement('nuxeo-blob-diff', { type: 'blob' });
      expect(Diff.getElement({ type: 'string', property: 'dc:title' })).to.equal('nuxeo-default-diff');
    });
  });
});
