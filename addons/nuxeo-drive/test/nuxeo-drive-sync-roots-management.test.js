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
import '../elements/nuxeo-drive-sync-roots-management.js';

suite('nuxeo-drive-sync-roots-management', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-drive-sync-roots-management></nuxeo-drive-sync-roots-management>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default roots to empty array', () => {
      expect(element.roots).to.be.an('array').that.is.empty;
    });
  });

  suite('_handleRoots', () => {
    test('should set roots from response entries', () => {
      const entries = [
        { uid: 'root1', title: 'Root 1', path: '/root1' },
        { uid: 'root2', title: 'Root 2', path: '/root2' },
      ];
      element._handleRoots({ detail: { response: { entries } } });
      expect(element.roots).to.deep.equal(entries);
    });

    test('should handle empty entries', () => {
      element._handleRoots({ detail: { response: { entries: [] } } });
      expect(element.roots).to.be.an('array').that.is.empty;
    });
  });

  suite('_empty', () => {
    test('should return true for empty array', () => {
      expect(element._empty([])).to.be.true;
    });

    test('should return false for non-empty array', () => {
      expect(element._empty([{ uid: '1' }])).to.be.false;
    });
  });

  suite('_disable', () => {
    test('should set input and execute disable operation', () => {
      sinon.stub(element.$.disable, 'execute').returns(Promise.resolve());
      sinon.stub(element, 'refresh').returns(Promise.resolve());
      sinon.stub(element.$.toast, 'toggle');

      const e = { model: { doc: { uid: 'doc123' } } };
      element._disable(e);
      expect(element.$.disable.input).to.equal('doc123');
      expect(element.$.disable.execute).to.have.been.called;
    });
  });

  suite('refresh', () => {
    test('should call roots execute', () => {
      const executeStub = sinon.stub(element.$.roots, 'execute').returns(Promise.resolve());
      element.refresh();
      expect(executeStub).to.have.been.calledWith(element);
    });
  });

  suite('document links', () => {
    // urlFor is a routing helper method provided by RoutingBehavior; shadow it with a stub for unit tests.
    setup(() => {
      Object.defineProperty(element, 'urlFor', {
        value: sinon.stub().callsFake((doc) => `/ui/#!/browse${doc.path}`),
        configurable: true,
        writable: true,
      });
    });

    test('should render each root title (only) as a link to the document', async () => {
      element.roots = [
        { uid: 'root1', title: 'Root 1', path: '/root1', type: 'Folder' },
        { uid: 'root2', title: 'Root 2', path: '/root2', type: 'Folder' },
      ];
      await flush();
      const rows = element.shadowRoot.querySelectorAll('.table .row');
      expect(rows).to.have.lengthOf(2);
      // Only the title cell links to the document; the path stays plain text.
      const links = element.shadowRoot.querySelectorAll('.table .row .cell a');
      expect(links).to.have.lengthOf(2);
      expect(links[0].textContent.trim()).to.equal('Root 1');
      expect(links[1].textContent.trim()).to.equal('Root 2');
      expect(links[0].getAttribute('href')).to.equal('/ui/#!/browse/root1');
      expect(links[1].getAttribute('href')).to.equal('/ui/#!/browse/root2');
      // The path cell renders the text without an anchor.
      const pathCell = rows[0].querySelector('.cell.flex-3');
      expect(pathCell.querySelector('a')).to.be.null;
      expect(pathCell.textContent.trim()).to.equal('/root1');
      expect(element.urlFor).to.have.been.calledWith(element.roots[0]);
      expect(element.urlFor).to.have.been.calledWith(element.roots[1]);
    });
  });
});
