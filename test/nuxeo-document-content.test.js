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
import '../elements/nuxeo-results/nuxeo-document-content.js';

suite('nuxeo-document-content', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-content></nuxeo-document-content>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'hasFacet').returns(false);
    sinon.stub(element, 'isTrashed').returns(false);
    sinon.stub(element, 'hasPermission').returns(false);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default provider to advanced_document_content', () => {
      expect(element.provider).to.equal('advanced_document_content');
    });

    test('should default pageSize to 40', () => {
      expect(element.pageSize).to.equal(40);
    });

    test('should default schemas', () => {
      expect(element.schemas).to.equal('dublincore,common,uid,file');
    });

    test('should default _lastIndex to 0', () => {
      expect(element._lastIndex).to.equal(0);
    });
  });

  suite('_contentStoredInColdStorage', () => {
    test('should return true when doc has ColdStorage facet and coldContent', () => {
      element.hasFacet.withArgs(sinon.match.any, 'ColdStorage').returns(true);
      const doc = { properties: { 'coldstorage:coldContent': { digest: 'abc' } } };
      expect(element._contentStoredInColdStorage(doc)).to.be.ok;
    });

    test('should return false when doc lacks ColdStorage facet', () => {
      const doc = { properties: { 'coldstorage:coldContent': { digest: 'abc' } } };
      expect(element._contentStoredInColdStorage(doc)).to.not.be.ok;
    });

    test('should return false when no coldContent property', () => {
      element.hasFacet.withArgs(sinon.match.any, 'ColdStorage').returns(true);
      const doc = { properties: {} };
      expect(element._contentStoredInColdStorage(doc)).to.not.be.ok;
    });
  });

  suite('inherited behavior methods', () => {
    test('_computeParams should return parent id and trashed status', () => {
      const doc = { uid: 'doc-123' };
      const params = element._computeParams(doc);
      expect(params).to.deep.equal({ ecm_parentId: 'doc-123', ecm_trashed: false });
    });

    test('_computeSort should return position sort for Orderable documents', () => {
      const doc = { uid: '1' };
      element.hasFacet.withArgs(doc, 'Orderable').returns(true);
      expect(element._computeSort(doc)).to.deep.equal({ 'ecm:pos': 'ASC' });
    });

    test('_computeSort should return empty sort for non-Orderable documents', () => {
      const doc = { uid: '1' };
      expect(element._computeSort(doc)).to.deep.equal({});
    });

    test('_hasWritePermission should check Write permission', () => {
      const doc = { uid: '1' };
      element.hasPermission.withArgs(doc, 'Write').returns(true);
      expect(element._hasWritePermission(doc)).to.be.true;
    });

    test('_navigate should fire navigate event', () => {
      const fireSpy = sinon.spy(element, 'fire');
      const item = { uid: 'doc-1' };
      const e = { model: { item }, stopPropagation: sinon.spy() };
      element._navigate(e);
      expect(fireSpy).to.have.been.calledWith('navigate', { doc: item });
    });

    test('_computeSortOptions should return 7 sort options', () => {
      const options = element._computeSortOptions();
      expect(options).to.have.length(7);
      expect(options[0].field).to.equal('dc:title');
    });
  });

  suite('WCAG H2: thumbnail combined with title in one link', () => {
    // Recursively collect elements matching selector, descending into <template> content.
    function queryAllDeep(root, selector) {
      const results = [];
      root.querySelectorAll(selector).forEach((el) => results.push(el));
      root.querySelectorAll('template').forEach((t) => {
        results.push(...queryAllDeep(t.content, selector));
      });
      return results;
    }

    let tmpl;

    suiteSetup(async () => {
      const url = '/elements/nuxeo-results/nuxeo-document-content.js';
      const response = await fetch(url);
      expect(response.ok, `Failed to fetch ${url}: ${response.status} ${response.statusText}`).to.be.true;
      const jsText = await response.text();
      const htmlTagIdx = jsText.indexOf('html`');
      expect(htmlTagIdx, `html\` template literal not found in ${url}`).to.be.greaterThan(-1);
      const htmlEndIdx = jsText.indexOf('`', htmlTagIdx + 5);
      expect(htmlEndIdx, `Closing \` for html\` template literal not found in ${url}`).to.be.greaterThan(htmlTagIdx);
      const templateHtml = jsText.substring(htmlTagIdx + 5, htmlEndIdx);
      const doc = new DOMParser().parseFromString(`<div>${templateHtml}</div>`, 'text/html');
      tmpl = doc.body.firstElementChild;
      expect(tmpl, `Failed to parse html\` template literal from ${url}`).to.exist;
    });

    test('nuxeo-document-thumbnail has alt="" (decorative image)', () => {
      const thumbnails = queryAllDeep(tmpl, 'nuxeo-document-thumbnail');
      expect(thumbnails.length).to.be.greaterThan(0, 'should have at least one nuxeo-document-thumbnail');
      thumbnails.forEach((thumb) => {
        expect(thumb.getAttribute('alt')).to.equal(
          '',
          `thumbnail should have alt="" but got "${thumb.getAttribute('alt')}"`,
        );
      });
    });

    test('nuxeo-document-thumbnail is inside an <a> link', () => {
      const thumbnails = queryAllDeep(tmpl, 'nuxeo-document-thumbnail');
      expect(thumbnails.length).to.be.greaterThan(0);
      thumbnails.forEach((thumb) => {
        const link = thumb.closest('a');
        expect(link, 'nuxeo-document-thumbnail should be a descendant of an <a> element').to.exist;
      });
    });
  });
});
