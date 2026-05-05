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
import '@polymer/polymer/polymer-legacy.js';
import { DiffBehavior } from '../elements/diff/nuxeo-diff-behavior.js';

suite('DiffBehavior', () => {
  let ctx;

  setup(() => {
    ctx = Object.create(DiffBehavior);
    ctx.set = sinon.stub();
  });

  suite('helper methods', () => {
    test('_isArray should detect arrays', () => {
      expect(ctx._isArray([])).to.be.true;
      expect(ctx._isArray([1, 2])).to.be.true;
      expect(ctx._isArray('string')).to.be.false;
      expect(ctx._isArray(null)).to.be.false;
    });

    test('_isObject should detect plain objects', () => {
      expect(ctx._isObject({})).to.be.true;
      expect(ctx._isObject({ a: 1 })).to.be.true;
      expect(ctx._isObject([])).to.be.false;
      expect(ctx._isObject(null)).to.not.be.ok;
      expect(ctx._isObject('string')).to.be.false;
    });

    test('_isNotObjectNorArray should detect primitives', () => {
      expect(ctx._isNotObjectNorArray('string')).to.be.true;
      expect(ctx._isNotObjectNorArray(42)).to.be.true;
      expect(ctx._isNotObjectNorArray([])).to.be.false;
      expect(ctx._isNotObjectNorArray({})).to.be.false;
    });

    test('_getKeys should return object keys', () => {
      expect(ctx._getKeys({ a: 1, b: 2 })).to.deep.equal(['a', 'b']);
    });

    test('_getValue should return property value from delta', () => {
      expect(ctx._getValue({ name: 'test' }, 'name')).to.equal('test');
      expect(ctx._getValue(null, 'name')).to.not.be.ok;
    });
  });

  suite('delta type detection', () => {
    test('_hasNoChanges should return true for falsy delta', () => {
      expect(ctx._hasNoChanges(null)).to.be.true;
      expect(ctx._hasNoChanges(undefined)).to.be.true;
      expect(ctx._hasNoChanges(false)).to.be.true;
    });

    test('_hasNoChanges should return false for truthy delta', () => {
      expect(ctx._hasNoChanges([1])).to.be.false;
    });

    test('_hasAddition should detect single-element arrays', () => {
      expect(ctx._hasAddition(['new value'])).to.be.true;
      expect(ctx._hasAddition(['new value'], true)).to.be.false; // hideAdditions
      expect(ctx._hasAddition(['old', 'new'])).to.be.false;
    });

    test('_getAddition should return added value', () => {
      expect(ctx._getAddition(['new value'])).to.equal('new value');
    });

    test('_hasModification should detect two-element arrays', () => {
      expect(ctx._hasModification(['old', 'new'])).to.be.true;
      expect(ctx._hasModification(['only'])).to.be.false;
      expect(ctx._hasModification(['a', 'b', 0])).to.be.false;
    });

    test('_getModificationOldValue should return first element', () => {
      expect(ctx._getModificationOldValue(['old', 'new'])).to.equal('old');
    });

    test('_getModificationNewValue should return second element', () => {
      expect(ctx._getModificationNewValue(['old', 'new'])).to.equal('new');
    });

    test('_hasDeletion should detect deletion marker [value, 0, 0]', () => {
      expect(ctx._hasDeletion(['deleted', 0, 0])).to.be.true;
      expect(ctx._hasDeletion(['deleted', 0, 0], true)).to.be.false; // hideDeletions
      expect(ctx._hasDeletion(['a', 'b', 2])).to.be.false; // text diff, not deletion
      expect(ctx._hasDeletion(['a', 'b', 3])).to.be.false; // array move, not deletion
    });

    test('_getDeletion should return deleted value', () => {
      expect(ctx._getDeletion(['deleted value', 0, 0])).to.equal('deleted value');
    });

    test('_hasArrayMove should detect array move marker', () => {
      expect(ctx._hasArrayMove(['', 1, 3])).to.be.true;
      expect(ctx._hasArrayMove(['', 1, 2])).to.be.false;
    });

    test('_hasTextDiff should detect text diff marker', () => {
      expect(ctx._hasTextDiff(['diff text', 0, 2])).to.be.true;
      expect(ctx._hasTextDiff(['diff text', 0, 3])).to.be.false;
    });

    test('_hasArrayInnerChanges should detect array inner changes', () => {
      expect(ctx._hasArrayInnerChanges({ _t: 'a', 0: ['val'] })).to.be.true;
      expect(ctx._hasArrayInnerChanges({ key: 'val' })).to.be.false;
      expect(ctx._hasArrayInnerChanges('string')).to.be.false;
    });

    test('_hasObjectInnerChanges should detect object inner changes', () => {
      expect(ctx._hasObjectInnerChanges({ key: ['old', 'new'] })).to.be.true;
      expect(ctx._hasObjectInnerChanges({ _t: 'a' })).to.be.false;
    });
  });

  suite('_computeLabel', () => {
    test('should return label when provided', () => {
      expect(ctx._computeLabel('prop', 'My Label')).to.equal('My Label');
    });

    test('should fallback to property name', () => {
      expect(ctx._computeLabel('dc:title', undefined)).to.equal('dc:title');
    });
  });

  suite('_incLevel', () => {
    test('should increment level by 1', () => {
      expect(ctx._incLevel(0)).to.equal(1);
      expect(ctx._incLevel(3)).to.equal(4);
    });
  });

  suite('_computeIndentStyle', () => {
    test('should compute margin based on level', () => {
      expect(ctx._computeIndentStyle(2, false)).to.equal('margin-left: 24px;');
    });

    test('should set margin to 0 for array items', () => {
      expect(ctx._computeIndentStyle(2, true)).to.equal('margin-left: 0px;');
    });
  });

  suite('_arrayItemType', () => {
    test('should strip array suffix', () => {
      expect(ctx._arrayItemType('string[]')).to.equal('string');
      expect(ctx._arrayItemType('document[]')).to.equal('document');
    });

    test('should return type as-is when no array suffix', () => {
      expect(ctx._arrayItemType('string')).to.equal('string');
    });

    test('should return string for falsy type', () => {
      expect(ctx._arrayItemType(null)).to.equal('string');
      expect(ctx._arrayItemType(undefined)).to.equal('string');
    });
  });

  suite('_getPropertySchema', () => {
    test('should return field schema for a property', () => {
      const schema = { fields: { title: { type: 'string' } } };
      expect(ctx._getPropertySchema(schema, 'title')).to.deep.equal({ type: 'string' });
    });

    test('should return whole schema when property is falsy', () => {
      const schema = { fields: { title: { type: 'string' } } };
      expect(ctx._getPropertySchema(schema, '')).to.equal(schema);
    });

    test('should return undefined when schema has no fields', () => {
      expect(ctx._getPropertySchema({}, 'title')).to.be.undefined;
    });
  });

  suite('_unwrapDelta', () => {
    test('should unwrap addition delta', () => {
      expect(ctx._unwrapDelta(['added'])).to.equal('added');
    });

    test('should unwrap deletion delta', () => {
      expect(ctx._unwrapDelta(['deleted', 0, 0])).to.equal('deleted');
    });

    test('should unwrap modification delta to old value', () => {
      expect(ctx._unwrapDelta(['old', 'new'])).to.equal('old');
    });

    test('should unwrap text diff delta', () => {
      expect(ctx._unwrapDelta(['diff text', 0, 2])).to.equal('diff text');
    });
  });

  suite('_isSimple', () => {
    test('should return true for simple delta', () => {
      expect(ctx._isSimple(['simple value'], undefined)).to.be.true;
    });

    test('should return true for simple originalValue when no delta', () => {
      expect(ctx._isSimple(undefined, 'simple')).to.be.true;
    });

    test('should return false for object originalValue when no delta', () => {
      expect(ctx._isSimple(undefined, { complex: true })).to.be.false;
    });

    test('should return false for array of objects when no delta', () => {
      expect(ctx._isSimple(undefined, [{ complex: true }])).to.be.false;
    });
  });

  suite('_showArrayItem', () => {
    test('should return true when showAll is true', () => {
      expect(ctx._showArrayItem({ modified: false }, true)).to.be.true;
    });

    test('should return true when item is modified', () => {
      expect(ctx._showArrayItem({ modified: true }, false)).to.be.true;
    });

    test('should return false when not modified and not showAll', () => {
      expect(ctx._showArrayItem({ modified: false }, false)).to.be.false;
    });
  });

  suite('_getAllKeys', () => {
    test('should return delta keys when showAll is false', () => {
      expect(ctx._getAllKeys({ a: 1 }, { a: 1, b: 2 }, false)).to.deep.equal(['a']);
    });

    test('should return originalValue keys when showAll is true', () => {
      expect(ctx._getAllKeys({ a: 1 }, { a: 1, b: 2 }, true)).to.deep.equal(['a', 'b']);
    });
  });

  suite('_getArrayDelta', () => {
    test('should return undefined when delta is null', () => {
      expect(ctx._getArrayDelta(null, [1, 2], [1, 2])).to.be.undefined;
    });

    test('should return undefined when originalValue is not an array', () => {
      expect(ctx._getArrayDelta({ _t: 'a' }, 'not-array', 'not-array')).to.be.undefined;
    });

    test('should mark unmodified items', () => {
      const delta = { _t: 'a' };
      const result = ctx._getArrayDelta(delta, ['a', 'b'], ['a', 'b']);
      expect(result).to.have.length(2);
      expect(result[0].modified).to.be.false;
      expect(result[0].change).to.equal('unchanged');
    });

    test('should mark deleted items', () => {
      const delta = { _t: 'a', _0: ['removed', 0, 0] };
      const result = ctx._getArrayDelta(delta, ['removed', 'kept'], ['kept']);
      expect(result.some((d) => d.change === 'deleted')).to.be.true;
    });

    test('should mark added items', () => {
      const delta = { _t: 'a', 1: ['added'] };
      const result = ctx._getArrayDelta(delta, ['existing'], ['existing', 'added']);
      expect(result.some((d) => d.change === 'added')).to.be.true;
    });

    test('should mark modified items when delta entry is an object', () => {
      const delta = { _t: 'a', 0: { name: ['old', 'new'] } };
      const result = ctx._getArrayDelta(delta, [{ name: 'old' }], [{ name: 'new' }]);
      expect(result.some((d) => d.change === 'modified')).to.be.true;
    });

    test('should skip deleted items when hideDeletions is true', () => {
      const delta = { _t: 'a', _0: ['removed', 0, 0] };
      const result = ctx._getArrayDelta(delta, ['removed', 'kept'], ['kept'], false, true);
      expect(result.every((d) => d.change !== 'deleted')).to.be.true;
    });

    test('should skip added items when hideAdditions is true', () => {
      const delta = { _t: 'a', 1: ['added'] };
      const result = ctx._getArrayDelta(delta, ['existing'], ['existing', 'added'], true, false);
      expect(result.every((d) => d.change !== 'added')).to.be.true;
    });

    test('should handle null newValue gracefully', () => {
      const delta = { _t: 'a', _0: ['removed', 0, 0] };
      const result = ctx._getArrayDelta(delta, ['removed', 'kept'], null);
      expect(result).to.be.an('array');
      expect(result.some((d) => d.change === 'deleted')).to.be.true;
      expect(result.find((d) => d.change === 'deleted').newValue).to.be.null;
    });
  });

  suite('_computeType', () => {
    test('should resolve type from schema fields', () => {
      ctx.type = 'string';
      ctx._computeType('title', { fields: { title: 'text' } }, null, null);
      expect(ctx.set).to.have.been.calledWith('type', 'text');
    });

    test('should resolve nested type object from schema', () => {
      ctx.type = 'string';
      ctx._computeType('title', { fields: { title: { type: 'text' } } }, null, null);
      expect(ctx.set).to.have.been.calledWith('type', 'text');
    });

    test('should infer entity type from originalValue object', () => {
      ctx.type = 'string';
      ctx._computeType('creator', { fields: {} }, null, { 'entity-type': 'user' });
      expect(ctx.set).to.have.been.calledWith('type', 'user');
    });

    test('should infer entity type from originalValue array', () => {
      ctx.type = 'string[]';
      ctx._computeType('subjects', { fields: {} }, null, [{ 'entity-type': 'directoryEntry' }]);
      expect(ctx.set).to.have.been.calledWith('type', 'directoryEntry[]');
    });

    test('should infer entity type from delta for string type', () => {
      ctx.type = 'string';
      ctx._computeType('creator', { fields: {} }, [{ 'entity-type': 'user' }], null);
      expect(ctx.set).to.have.been.calledWith('type', 'user');
    });

    test('should infer entity type from delta for string[] type', () => {
      ctx.type = 'string[]';
      const delta = { 0: [{ 'entity-type': 'directoryEntry' }] };
      ctx._computeType('subjects', { fields: {} }, delta, []);
      expect(ctx.set).to.have.been.calledWith('type', 'directoryEntry[]');
    });

    test('should keep type as-is when no schema or entity-type can be inferred', () => {
      ctx.type = 'date';
      ctx._computeType(null, null, null, null);
      expect(ctx.set).to.have.been.calledWith('type', 'date');
    });
  });

  suite('_computeDefaultClass', () => {
    test('should return simple for simple delta', () => {
      expect(ctx._computeDefaultClass(['added'], undefined)).to.equal('simple');
    });

    test('should return complex for object delta', () => {
      expect(ctx._computeDefaultClass([{ nested: true }], undefined)).to.equal('complex');
    });

    test('should return simple for simple originalValue when no delta', () => {
      expect(ctx._computeDefaultClass(undefined, 'text')).to.equal('simple');
    });

    test('should return complex for object originalValue when no delta', () => {
      expect(ctx._computeDefaultClass(undefined, { nested: true })).to.equal('complex');
    });
  });

  suite('_computeArrayClass', () => {
    test('should return simple when delta is falsy and originalValue is simple', () => {
      expect(ctx._computeArrayClass(undefined, 'text', null, false, false)).to.equal('simple');
    });

    test('should return simple when delta produces empty array', () => {
      expect(ctx._computeArrayClass({ _t: 'a' }, [], [], false, false)).to.equal('simple');
    });

    test('should derive class from first array delta item', () => {
      const delta = { _t: 'a', _0: ['removed', 0, 0] };
      const result = ctx._computeArrayClass(delta, ['removed'], [], false, false);
      expect(result).to.be.oneOf(['simple', 'complex']);
    });
  });

  suite('_isSimpleDelta', () => {
    test('should return true for addition of a primitive', () => {
      expect(ctx._isSimpleDelta(['hello'])).to.be.true;
    });

    test('should return false for addition of an object', () => {
      expect(ctx._isSimpleDelta([{ complex: true }])).to.be.false;
    });

    test('should return true for modification of primitives', () => {
      expect(ctx._isSimpleDelta(['old', 'new'])).to.be.true;
    });

    test('should return true for deletion of a primitive', () => {
      expect(ctx._isSimpleDelta(['removed', 0, 0])).to.be.true;
    });
  });

  suite('_unwrapDelta (additional cases)', () => {
    test('should unwrap modification to old value or new value', () => {
      expect(ctx._unwrapDelta([null, 'new'])).to.equal('new');
    });

    test('should unwrap array inner changes', () => {
      const delta = { _t: 'a', 0: ['value'] };
      expect(ctx._unwrapDelta(delta)).to.equal('value');
    });

    test('should unwrap array inner changes when value is not array', () => {
      const delta = { _t: 'a', 0: { nested: true } };
      expect(ctx._unwrapDelta(delta)).to.deep.equal({ nested: true });
    });

    test('should return delta as-is when it matches no pattern', () => {
      expect(ctx._unwrapDelta('plain')).to.equal('plain');
    });
  });

  suite('_getTextDiff', () => {
    test('should return undefined when text is falsy', () => {
      expect(ctx._getTextDiff(null, 'original', false, false)).to.be.undefined;
    });

    test('should return undefined when originalValue is falsy', () => {
      expect(ctx._getTextDiff(['@@ -1,3 +1,3 @@\n-old\n+new\n'], null, false, false)).to.be.undefined;
    });

    test('should produce diff with additions and deletions', () => {
      const text = ['@@ -1,1 +1,1 @@\n-old\n+new\n'];
      const result = ctx._getTextDiff(text, 'old', false, false);
      expect(result).to.be.a('string');
      expect(result).to.contain('<span class="deleted">old</span>');
      expect(result).to.contain('<span class="added">new</span>');
    });

    test('should hide deletions when hideDeletions is true', () => {
      const text = ['@@ -1,1 +1,1 @@\n-old\n+new\n'];
      const result = ctx._getTextDiff(text, 'old', false, true);
      expect(result).to.not.contain('<span class="deleted">');
      expect(result).to.contain('<span class="added">new</span>');
    });

    test('should hide additions when hideAdditions is true', () => {
      const text = ['@@ -1,1 +1,1 @@\n-old\n+new\n'];
      const result = ctx._getTextDiff(text, 'old', true, false);
      expect(result).to.contain('<span class="deleted">old</span>');
      expect(result).to.not.contain('<span class="added">');
    });
  });
});
