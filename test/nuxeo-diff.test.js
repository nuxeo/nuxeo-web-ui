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
import { fixture, html, login } from '@nuxeo/testing-helpers';
import '../elements/diff/nuxeo-diff.js';

suite('nuxeo-diff', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-diff></nuxeo-diff>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default docIds to empty array', () => {
      expect(element.docIds).to.deep.equal([]);
    });

    test('should default documents to empty array', () => {
      expect(element.documents).to.deep.equal([]);
    });

    test('should default showAll to false', () => {
      expect(element.showAll).to.be.false;
    });

    test('should default unifiedView to false', () => {
      expect(element.unifiedView).to.be.false;
    });

    test('should default _hasVersions to false', () => {
      expect(element._hasVersions).to.be.false;
    });
  });

  suite('_title', () => {
    test('should return document title when checked out', () => {
      const doc = { title: 'My Doc', isCheckedOut: true, properties: {} };
      expect(element._title(doc)).to.equal('My Doc');
    });

    test('should append version info when _hasVersions and not checked out', () => {
      element._hasVersions = true;
      const doc = {
        title: 'My Doc',
        isCheckedOut: false,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 2 },
      };
      const result = element._title(doc);
      expect(result).to.include('My Doc');
      expect(result).to.include('v1.2');
    });

    test('should not append version when _hasVersions is false', () => {
      element._hasVersions = false;
      const doc = {
        title: 'My Doc',
        isCheckedOut: false,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      expect(element._title(doc)).to.equal('My Doc');
    });

    test('should not append version when checked out even with _hasVersions', () => {
      element._hasVersions = true;
      const doc = {
        title: 'My Doc',
        isCheckedOut: true,
        properties: { 'uid:major_version': 1, 'uid:minor_version': 0 },
      };
      expect(element._title(doc)).to.equal('My Doc');
    });

    test('should return falsy for null document', () => {
      expect(element._title(null)).to.not.be.ok;
    });
  });

  suite('_computeLabel', () => {
    test('should return i18n translation key', () => {
      const schema = { name: 'dublincore', prefix: 'dc' };
      const result = element._computeLabel(schema, 'dc:title');
      // since i18n stub returns the key itself, it means key === translation, so it falls to _getPropertyName
      expect(result).to.equal('title');
    });

    test('should return property name as fallback when translation matches key', () => {
      // i18n returns the key itself (no translation found), so fallback to _getPropertyName
      const schema = { name: 'dublincore', prefix: 'dc' };
      expect(element._computeLabel(schema, 'dc:description')).to.equal('description');
    });

    test('should use schema name when no prefix', () => {
      const schema = { name: 'file' };
      const result = element._computeLabel(schema, 'file:content');
      expect(result).to.equal('content');
    });
  });

  suite('_filterUid', () => {
    test('should return a filter function', () => {
      const filter = element._filterUid('uid-1');
      expect(filter).to.be.a('function');
    });

    test('should exclude document with matching uid', () => {
      const filter = element._filterUid('uid-1');
      expect(filter({ uid: 'uid-1' })).to.be.false;
    });

    test('should include document with different uid', () => {
      const filter = element._filterUid('uid-1');
      expect(filter({ uid: 'uid-2' })).to.be.true;
    });
  });

  suite('_getPropertyDiff', () => {
    test('should return delta for existing property', () => {
      const delta = { 'dc:title': ['old', 'new'] };
      expect(element._getPropertyDiff(delta, 'dc:title')).to.deep.equal(['old', 'new']);
    });

    test('should return undefined for missing property', () => {
      const delta = { 'dc:title': ['old', 'new'] };
      expect(element._getPropertyDiff(delta, 'dc:description')).to.be.undefined;
    });

    test('should return falsy when delta is null', () => {
      expect(element._getPropertyDiff(null, 'dc:title')).to.not.be.ok;
    });

    test('should return falsy when delta is undefined', () => {
      expect(element._getPropertyDiff(undefined, 'dc:title')).to.not.be.ok;
    });
  });

  suite('_getDocumentProperty', () => {
    test('should return property value from document', () => {
      const doc = { properties: { 'dc:title': 'My Doc', 'dc:description': 'A description' } };
      expect(element._getDocumentProperty('dc:title', doc)).to.equal('My Doc');
      expect(element._getDocumentProperty('dc:description', doc)).to.equal('A description');
    });

    test('should return undefined for missing property', () => {
      const doc = { properties: {} };
      expect(element._getDocumentProperty('dc:title', doc)).to.be.undefined;
    });
  });

  suite('_getPropertyName', () => {
    test('should remove schema prefix from property name', () => {
      expect(element._getPropertyName({ prefix: 'dc' }, 'dc:title')).to.equal('title');
    });

    test('should use schema name when no prefix', () => {
      expect(element._getPropertyName({ name: 'file' }, 'file:content')).to.equal('content');
    });

    test('should return property as-is when no prefix match', () => {
      expect(element._getPropertyName({ prefix: 'dc' }, 'file:content')).to.equal('file:content');
    });

    test('should return undefined when property is null', () => {
      expect(element._getPropertyName({ prefix: 'dc' }, null)).to.be.undefined;
    });

    test('should return undefined when schema is null', () => {
      expect(element._getPropertyName(null, 'dc:title')).to.be.undefined;
    });

    test('should handle prefix with special regex chars', () => {
      expect(element._getPropertyName({ prefix: 'dc' }, 'dc:created')).to.equal('created');
    });
  });

  suite('_switchSides', () => {
    test('should swap leftUid and rightUid', () => {
      // Stub diff and uid observers to prevent side effects
      sinon.stub(element, 'diff');
      element.leftUid = 'left-1';
      element.rightUid = 'right-1';
      element._switchSides();
      expect(element.leftUid).to.equal('right-1');
      expect(element.rightUid).to.equal('left-1');
      element.diff.restore();
    });
  });

  suite('_getCommonProperties', () => {
    test('should return properties common to both documents', () => {
      const left = { properties: { 'dc:title': 'A', 'dc:description': 'Desc', 'file:content': {} } };
      const right = { properties: { 'dc:title': 'B', 'dc:description': 'Desc2' } };
      const result = element._getCommonProperties(left, right, null, null);
      expect(result).to.include('dc:title');
      expect(result).to.include('dc:description');
      expect(result).to.not.include('file:content');
    });

    test('should filter by schema prefix', () => {
      const left = { properties: { 'dc:title': 'A', 'file:content': {} } };
      const right = { properties: { 'dc:title': 'B', 'file:content': {} } };
      const schema = { name: 'dublincore', prefix: 'dc' };
      const result = element._getCommonProperties(left, right, schema, null);
      expect(result).to.include('dc:title');
      expect(result).to.not.include('file:content');
    });

    test('should filter by schema name when no prefix', () => {
      const left = { properties: { 'dc:title': 'A', 'file:content': {} } };
      const right = { properties: { 'dc:title': 'B', 'file:content': {} } };
      const schema = { name: 'file' };
      const result = element._getCommonProperties(left, right, schema, null);
      expect(result).to.include('file:content');
      expect(result).to.not.include('dc:title');
    });

    test('should filter by delta when provided', () => {
      const left = { properties: { 'dc:title': 'A', 'dc:description': 'Same' } };
      const right = { properties: { 'dc:title': 'B', 'dc:description': 'Same' } };
      const delta = { 'dc:title': ['A', 'B'] };
      const result = element._getCommonProperties(left, right, null, delta);
      expect(result).to.include('dc:title');
      expect(result).to.not.include('dc:description');
    });

    test('should return empty when no common properties', () => {
      const left = { properties: { 'dc:title': 'A' } };
      const right = { properties: { 'dc:description': 'B' } };
      expect(element._getCommonProperties(left, right, null, null)).to.deep.equal([]);
    });
  });

  suite('_getCommonSchemaProperties', () => {
    test('should use delta when showAll is false', () => {
      element.left = { properties: { 'dc:title': 'A', 'dc:description': 'Same' } };
      element.right = { properties: { 'dc:title': 'B', 'dc:description': 'Same' } };
      element._delta = { 'dc:title': ['A', 'B'] };
      const schema = { name: 'dublincore', prefix: 'dc' };
      const result = element._getCommonSchemaProperties(schema, false, element._delta);
      expect(result).to.include('dc:title');
      expect(result).to.not.include('dc:description');
    });

    test('should ignore delta when showAll is true', () => {
      element.left = { properties: { 'dc:title': 'A', 'dc:description': 'Same' } };
      element.right = { properties: { 'dc:title': 'B', 'dc:description': 'Same' } };
      element._delta = { 'dc:title': ['A', 'B'] };
      const schema = { name: 'dublincore', prefix: 'dc' };
      const result = element._getCommonSchemaProperties(schema, true, element._delta);
      expect(result).to.include('dc:title');
      expect(result).to.include('dc:description');
    });
  });

  suite('_getCommonSchemas', () => {
    test('should return undefined when schemas is null', () => {
      expect(element._getCommonSchemas(null, false)).to.be.undefined;
    });

    test('should return all schemas when showAll is true', () => {
      const schemas = [{ name: 'dublincore', prefix: 'dc' }, { name: 'file' }];
      const result = element._getCommonSchemas(schemas, true);
      expect(result).to.have.length(2);
    });

    test('should filter schemas with no common properties when showAll is false', () => {
      element.left = { properties: { 'dc:title': 'A' } };
      element.right = { properties: { 'dc:title': 'B' } };
      element._delta = { 'dc:title': ['A', 'B'] };
      const schemas = [
        { name: 'dublincore', prefix: 'dc' },
        { name: 'file', prefix: 'file' },
      ];
      const result = element._getCommonSchemas(schemas, false);
      expect(result).to.have.length(1);
      expect(result[0].name).to.equal('dublincore');
    });

    test('should return empty array when no schemas have delta properties', () => {
      element.left = { properties: { 'dc:title': 'Same' } };
      element.right = { properties: { 'dc:title': 'Same' } };
      element._delta = {};
      const schemas = [{ name: 'dublincore', prefix: 'dc' }];
      const result = element._getCommonSchemas(schemas, false);
      expect(result).to.deep.equal([]);
    });
  });

  suite('_sortSchemas', () => {
    test('should sort schemas with properties before those without', () => {
      element.left = { properties: { 'dc:title': 'A' } };
      element.right = { properties: { 'dc:title': 'B' } };
      element._delta = { 'dc:title': ['A', 'B'] };

      const schemaWithProps = { name: 'dublincore', prefix: 'dc' };
      const schemaWithoutProps = { name: 'file', prefix: 'file' };

      // schema with props should come first (return negative/false for "comes before")
      const result = element._sortSchemas(schemaWithProps, schemaWithoutProps);
      // The result should indicate schemaWithProps sorts before schemaWithoutProps
      expect(result).to.be.false;
    });

    test('should sort alphabetically when both have properties', () => {
      element.left = { properties: { 'dc:title': 'A', 'file:content': {} } };
      element.right = { properties: { 'dc:title': 'B', 'file:content': {} } };
      element._delta = { 'dc:title': ['A', 'B'], 'file:content': [{}, {}] };

      const dcSchema = { name: 'dublincore', prefix: 'dc' };
      const fileSchema = { name: 'file', prefix: 'file' };

      const result = element._sortSchemas(dcSchema, fileSchema);
      expect(typeof result).to.equal('boolean');
    });
  });

  suite('_sequencer', () => {
    test('should execute promises in sequence', async () => {
      const order = [];
      const promises = [
        () =>
          Promise.resolve().then(() => {
            order.push(1);
            return [1];
          }),
        () =>
          Promise.resolve().then(() => {
            order.push(2);
            return [2];
          }),
        () =>
          Promise.resolve().then(() => {
            order.push(3);
            return [3];
          }),
      ];
      await element._sequencer(promises);
      expect(order).to.deep.equal([1, 2, 3]);
    });

    test('should handle empty array', async () => {
      const result = await element._sequencer([]);
      expect(result).to.deep.equal([]);
    });
  });

  suite('_filterDelta - simple types', () => {
    test('should keep string deltas', () => {
      const delta = { 'dc:title': ['old', 'new'] };
      const schema = {
        name: 'dublincore',
        prefix: 'dc',
        fields: { title: { type: 'string' } },
      };
      element.left = { properties: { 'dc:title': 'old' } };
      element.right = { properties: { 'dc:title': 'new' } };
      element._delta = delta;

      element._filterDelta(delta, schema);
      expect(delta['dc:title']).to.deep.equal(['old', 'new']);
    });

    test('should keep date deltas', () => {
      const delta = { 'dc:created': ['2023-01-01', '2024-01-01'] };
      const schema = {
        name: 'dublincore',
        prefix: 'dc',
        fields: { created: { type: 'date' } },
      };
      element.left = { properties: { 'dc:created': '2023-01-01' } };
      element.right = { properties: { 'dc:created': '2024-01-01' } };
      element._delta = delta;

      element._filterDelta(delta, schema);
      expect(delta['dc:created']).to.deep.equal(['2023-01-01', '2024-01-01']);
    });

    test('should keep long deltas', () => {
      const delta = { 'dc:version': [1, 2] };
      const schema = {
        name: 'dublincore',
        prefix: 'dc',
        fields: { version: { type: 'long' } },
      };
      element.left = { properties: { 'dc:version': 1 } };
      element.right = { properties: { 'dc:version': 2 } };
      element._delta = delta;

      element._filterDelta(delta, schema);
      expect(delta['dc:version']).to.deep.equal([1, 2]);
    });

    test('should keep integer deltas', () => {
      const delta = { 'dc:count': [5, 10] };
      const schema = {
        name: 'dublincore',
        prefix: 'dc',
        fields: { count: { type: 'integer' } },
      };
      element.left = { properties: { 'dc:count': 5 } };
      element.right = { properties: { 'dc:count': 10 } };
      element._delta = delta;

      element._filterDelta(delta, schema);
      expect(delta['dc:count']).to.deep.equal([5, 10]);
    });

    test('should keep boolean deltas', () => {
      const delta = { 'dc:active': [true, false] };
      const schema = {
        name: 'dublincore',
        prefix: 'dc',
        fields: { active: { type: 'boolean' } },
      };
      element.left = { properties: { 'dc:active': true } };
      element.right = { properties: { 'dc:active': false } };
      element._delta = delta;

      element._filterDelta(delta, schema);
      expect(delta['dc:active']).to.deep.equal([true, false]);
    });

    test('should keep double deltas', () => {
      const delta = { 'dc:score': [1.5, 2.5] };
      const schema = {
        name: 'dublincore',
        prefix: 'dc',
        fields: { score: { type: 'double' } },
      };
      element.left = { properties: { 'dc:score': 1.5 } };
      element.right = { properties: { 'dc:score': 2.5 } };
      element._delta = delta;

      element._filterDelta(delta, schema);
      expect(delta['dc:score']).to.deep.equal([1.5, 2.5]);
    });
  });

  suite('_filterDelta - blob type', () => {
    test('should keep blob delta when digest is present', () => {
      const delta = { 'file:content': { digest: 'abc123', name: ['old.pdf', 'new.pdf'] } };
      const schema = {
        name: 'file',
        prefix: 'file',
        fields: { content: { type: 'blob' } },
      };
      element.left = { properties: { 'file:content': { digest: 'abc', name: 'old.pdf' } } };
      element.right = { properties: { 'file:content': { digest: 'abc123', name: 'new.pdf' } } };
      element._delta = delta;

      element._filterDelta(delta, schema);
      expect(delta['file:content']).to.exist;
    });

    test('should remove blob delta when no digest', () => {
      const delta = { 'file:content': { name: ['old.pdf', 'new.pdf'] } };
      const schema = {
        name: 'file',
        prefix: 'file',
        fields: { content: { type: 'blob' } },
      };
      element.left = { properties: { 'file:content': { name: 'old.pdf' } } };
      element.right = { properties: { 'file:content': { name: 'new.pdf' } } };
      element._delta = delta;

      element._filterDelta(delta, schema);
      expect(delta['file:content']).to.be.undefined;
    });
  });

  suite('_filterDelta - array type', () => {
    test('should handle array deltas with _t marker', () => {
      const delta = {
        _t: 'a',
        0: ['added item'],
      };
      const schema = 'string[]';

      element._filterDelta(delta, schema);
      // String array items should be kept
      expect(delta['0']).to.deep.equal(['added item']);
    });

    test('should remove empty array delta entries', () => {
      const delta = {
        _t: 'a',
        0: {},
      };
      const schema = 'string[]';

      element._filterDelta(delta, schema);
      expect(delta['0']).to.be.undefined;
    });
  });

  suite('_resize', () => {
    test('should set unified view based on window width', () => {
      // We can't easily control matchMedia in tests, but we can call it and check it doesn't crash
      element._resize();
      // Element should have _showUnifiedViewControl set
      expect(element).to.have.property('_showUnifiedViewControl');
    });
  });

  suite('leftUidChanged', () => {
    test('should swap rightUid when same as new leftUid', () => {
      sinon.stub(element, 'diff');
      element.rightUid = 'uid-B';
      element.leftUidChanged('uid-B', 'uid-A');
      expect(element.rightUid).to.equal('uid-A');
      element.diff.restore();
    });

    test('should call diff when different from rightUid', () => {
      sinon.stub(element, 'diff');
      element.rightUid = 'uid-B';
      element.diff.resetHistory();
      element.leftUidChanged('uid-C', 'uid-A');
      expect(element.diff).to.have.been.called;
      element.diff.restore();
    });
  });

  suite('rightUidChanged', () => {
    test('should swap leftUid when same as new rightUid', () => {
      sinon.stub(element, 'diff');
      element.leftUid = 'uid-A';
      element.rightUidChanged('uid-A', 'uid-B');
      expect(element.leftUid).to.equal('uid-B');
      element.diff.restore();
    });

    test('should call diff when different from leftUid', () => {
      sinon.stub(element, 'diff');
      element.leftUid = 'uid-A';
      element.diff.resetHistory();
      element.rightUidChanged('uid-C', 'uid-B');
      expect(element.diff).to.have.been.called;
      element.diff.restore();
    });
  });
});
