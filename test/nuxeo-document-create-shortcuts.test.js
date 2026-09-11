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
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-document-create-actions/nuxeo-document-create-shortcuts.js';
import '../elements/nuxeo-document-create-actions/nuxeo-document-create-shortcut.js';

suite('nuxeo-document-create-shortcuts', () => {
  let el;

  setup(async () => {
    el = await fixture(html`<nuxeo-document-create-shortcuts></nuxeo-document-create-shortcuts>`);
    await flush();
  });

  test('_observeVisibility runs _updateShortcuts when host becomes visible', () => {
    const spy = sinon.spy(el, '_updateShortcuts');
    el.hostVisible = true;
    expect(spy).to.have.been.called;
    spy.restore();
  });

  test('_updateShortcuts renders shortcut elements for allowed subtypes', async () => {
    sinon.stub(el.$.creationStats, 'lastType').returns(['File']);
    sinon.stub(el.$.creationStats, 'mostCommonType').returns(['Workspace']);
    sinon.stub(el, 'formatDocType').callsFake((t) => `Label ${t}`);
    el.subtypes = ['File', 'Workspace'];

    el._updateShortcuts();
    await flush();

    const nodes = Array.from(el.$.shortcuts.children);
    expect(nodes.length).to.equal(2);
    expect(nodes.every((n) => n.tagName.toLowerCase() === 'nuxeo-document-create-shortcut')).to.be.true;
    el.$.creationStats.lastType.restore();
    el.$.creationStats.mostCommonType.restore();
    el.formatDocType.restore();
  });

  test('_putNodes replaces children with flattened node lists', () => {
    const parent = document.createElement('div');
    const a = document.createElement('span');
    a.id = 'a';
    const b = document.createElement('span');
    b.id = 'b';
    parent.appendChild(document.createElement('i'));

    el._putNodes(parent, [a, b]);
    expect(parent.children.length).to.equal(2);
    expect(parent.querySelector('#a')).to.exist;
    expect(parent.querySelector('#b')).to.exist;

    el._putNodes(parent);
    expect(parent.children.length).to.equal(0);
  });

  test('_putNodes appends a node passed outside an array and detaches the previous children', () => {
    const parent = document.createElement('div');
    const stale = document.createElement('i');
    parent.appendChild(stale);
    const solo = document.createElement('span');
    solo.id = 'solo';

    el._putNodes(parent, solo);

    expect(parent.children.length).to.equal(1);
    expect(parent.querySelector('#solo')).to.exist;
    expect(stale.parentNode).to.be.null;
  });
});
