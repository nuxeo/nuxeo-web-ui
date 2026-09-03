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
import { fixture, flush, html, login } from '@nuxeo/testing-helpers';
import '../elements/document/nuxeo-collapsible-document-page.js';

suite('nuxeo-collapsible-document-page', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-collapsible-document-page></nuxeo-collapsible-document-page>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'hasPermission').returns(true);
    sinon.stub(element, '_hasCollections').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('tags section', () => {
    test('is not rendered when the document is not taggable', async () => {
      element.document = { uid: '1', type: 'File' };
      await flush();

      expect(element.shadowRoot.querySelector('nuxeo-tag-suggestion')).to.not.exist;
    });

    test('renders the tags widget with a visible label instead of a detached heading', async () => {
      const doc = { uid: '1', type: 'File' };
      element.hasFacet.withArgs(doc, 'NXTag').returns(true);
      element.document = doc;
      await flush();

      const tags = element.shadowRoot.querySelector('nuxeo-tag-suggestion');
      expect(tags).to.exist;
      expect(tags.label).to.equal(element.i18n('documentPage.tags'));
      expect(tags.label).to.not.be.empty;
      // the caption is now the widget's own label, not a heading detached from the field
      expect(tags.parentElement.querySelector('h5')).to.not.exist;
    });

    test('is read only when the user cannot write properties', async () => {
      const doc = { uid: '1', type: 'File' };
      element.hasFacet.withArgs(doc, 'NXTag').returns(true);
      element.hasPermission.withArgs(doc, 'WriteProperties').returns(false);
      element.document = doc;
      await flush();

      expect(element.shadowRoot.querySelector('nuxeo-tag-suggestion').readonly).to.be.true;
    });
  });
});
