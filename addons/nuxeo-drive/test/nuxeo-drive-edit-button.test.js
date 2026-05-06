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
import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-drive-edit-button.js';
import * as protocolHandler from '../elements/nuxeo-drive-protocol-handler.js';

// Prevent nxdrive:// anchor clicks from triggering a Karma page reload
HTMLAnchorElement.prototype.click = function () {};

// Setup i18n keys used by the component
window.nuxeo = window.nuxeo || {};
window.nuxeo.I18n = window.nuxeo.I18n || {};
window.nuxeo.I18n.language = 'en';
window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
window.nuxeo.I18n.en['driveEditButton.tooltip'] = 'Open with Nuxeo Drive';
window.nuxeo.I18n.en['driveEditButton.directTransfer.failed'] =
  'An error occurred while trying to open the document with Nuxeo Drive.';
window.nuxeo.I18n.en['driveEditButton.dialog.heading'] = 'Download Nuxeo Drive Client';
window.nuxeo.I18n.en['command.close'] = 'Close';

suite('nuxeo-drive-edit-button — error handling', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-drive-edit-button></nuxeo-drive-edit-button>`);
  });

  suite('_go — token fetch failure', () => {
    let toastStub;

    setup(() => {
      toastStub = { text: '', open: sinon.spy() };
      sinon.stub(element.$, 'toast').value(toastStub);
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => {
      sinon.restore();
    });

    test('shows error toast when token.get rejects', async () => {
      sinon.stub(element.$.token, 'get').rejects(new Error('network error'));

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(toastStub.open).to.have.been.calledOnce;
      expect(toastStub.text).to.include('error occurred');
    });

    test('does not open dialog when token.get rejects', async () => {
      sinon.stub(element.$.token, 'get').rejects(new Error('network error'));
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(dialogToggleStub).to.not.have.been.called;
    });
  });

  suite('_go — no token registered (Drive not authenticated)', () => {
    let toastStub;

    setup(() => {
      toastStub = { text: '', open: sinon.spy() };
      sinon.stub(element.$, 'toast').value(toastStub);
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
    });

    teardown(() => {
      sinon.restore();
    });

    test('opens install dialog when token list is empty', async () => {
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(dialogToggleStub).to.have.been.calledOnce;
      expect(toastStub.open).to.not.have.been.called;
    });

    test('does not show error toast when token list is empty', async () => {
      sinon.stub(element.$.token, 'get').resolves({ entries: [] });
      sinon.stub(element.$.dialog, 'toggle');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(toastStub.open).to.not.have.been.called;
    });
  });

  suite('_go — Drive installed and token present', () => {
    teardown(() => {
      sinon.restore();
    });

    test('calls _openDriveUrl with driveEditURL when token exists', async () => {
      element.user = { id: 'Administrator' };
      element.document = { uid: 'doc-uid-1', repository: 'default' };
      element.blob = { data: 'http://localhost/nxfile/default/doc-uid-1/file:content/test.docx', name: 'test.docx' };
      sinon.stub(element.$.token, 'get').resolves({ entries: [{ id: 'token-abc' }] });
      const openDriveUrlStub = sinon.stub(element, '_openDriveUrl');

      element._go();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(openDriveUrlStub).to.have.been.calledOnce;
      expect(openDriveUrlStub.firstCall.args[0]).to.match(/^nxdrive:\/\/edit\//);
    });
  });

  // _openDriveUrl — wires the shared openDriveUrl with the element's dialog toggle.
  // The blur/debounce detection logic itself is tested in nuxeo-drive-protocol-handler.test.js
  suite('_openDriveUrl', () => {
    teardown(() => {
      sinon.restore();
    });

    test('delegates to the shared openDriveUrl and passes dialog toggle as callback', () => {
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
      const dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
      expect(() =>
        element._openDriveUrl(
          'nxdrive://edit/localhost/user/Administrator/repo/default/nxdocid/abc/filename/test.docx',
        ),
      ).to.not.throw();
      return new Promise((resolve) => setTimeout(resolve, 1600)).then(() => {
        expect(dialogToggleStub).to.have.been.calledOnce;
      });
    });
  });

  // ---------------------------------------------------------------------------
  // navigateTo (moved to shared module — tested via protocolHandler.navigateTo)
  // ---------------------------------------------------------------------------
  suite('navigateTo', () => {
    teardown(() => {
      sinon.restore();
    });

    test('appends an anchor to document.body, clicks it, then removes it', () => {
      const appendSpy = sinon.spy(document.body, 'appendChild');
      const removeSpy = sinon.spy(document.body, 'removeChild');

      protocolHandler.navigateTo(
        'nxdrive://edit/localhost/user/Administrator/repo/default/nxdocid/abc/filename/test.docx',
      );

      expect(appendSpy).to.have.been.calledOnce;
      const anchor = appendSpy.firstCall.args[0];
      expect(anchor.tagName).to.equal('A');
      expect(anchor.href).to.include('nxdrive');
      expect(removeSpy).to.have.been.calledOnce;
      expect(removeSpy.firstCall.args[0]).to.equal(anchor);
    });

    test('does not modify window.location', () => {
      const before = window.location.href;
      protocolHandler.navigateTo(
        'nxdrive://edit/localhost/user/Administrator/repo/default/nxdocid/abc/filename/test.docx',
      );
      expect(window.location.href).to.equal(before);
    });

    test('anchor has aria-hidden and tabindex=-1 (accessible)', () => {
      const appendSpy = sinon.spy(document.body, 'appendChild');
      protocolHandler.navigateTo(
        'nxdrive://edit/localhost/user/Administrator/repo/default/nxdocid/abc/filename/test.docx',
      );
      const anchor = appendSpy.firstCall.args[0];
      expect(anchor.getAttribute('aria-hidden')).to.equal('true');
      expect(anchor.getAttribute('tabindex')).to.equal('-1');
    });
  });
  suite('_showError', () => {
    teardown(() => {
      sinon.restore();
    });

    test('sets toast text and opens it', () => {
      const toastStub = { text: '', open: sinon.spy() };
      sinon.stub(element.$, 'toast').value(toastStub);

      element._showError('Something went wrong');

      expect(toastStub.text).to.equal('Something went wrong');
      expect(toastStub.open).to.have.been.calledOnce;
    });
  });

  // ---------------------------------------------------------------------------
  // _isAvailable — branch coverage
  // ---------------------------------------------------------------------------
  suite('_isAvailable', () => {
    const baseDoc = () => {
      return {
        uid: 'doc-1',
        facets: [],
        contextParameters: { permissions: ['Write', 'Read'] },
      };
    };

    const blobWithNoAppLinks = { data: 'http://localhost/nxfile/default/doc-1/file:content/test.docx', appLinks: [] };

    test('returns false when blob is null', () => {
      expect(element._isAvailable(baseDoc(), null)).to.not.be.ok;
    });

    test('returns false when blob is undefined', () => {
      expect(element._isAvailable(baseDoc(), undefined)).to.not.be.ok;
    });

    test('returns false when blob.appLinks is non-empty', () => {
      const blobWithLinks = { ...blobWithNoAppLinks, appLinks: [{ name: 'SomeApp', url: 'someapp://open' }] };
      expect(element._isAvailable(baseDoc(), blobWithLinks)).to.be.false;
    });

    test('returns false when doc lacks Write permission', () => {
      const doc = { uid: 'doc-1', facets: [], contextParameters: { permissions: ['Read'] } };
      expect(element._isAvailable(doc, blobWithNoAppLinks)).to.be.false;
    });

    test('returns false when doc is a proxy', () => {
      const doc = {
        uid: 'doc-1',
        facets: ['Immutable', 'HiddenInNavigation'],
        isProxy: true,
        contextParameters: { permissions: ['Write'] },
      };
      expect(element._isAvailable(doc, blobWithNoAppLinks)).to.be.false;
    });
  });

  // ---------------------------------------------------------------------------
  // driveEditURL — null guard
  // ---------------------------------------------------------------------------
  suite('driveEditURL', () => {
    test('returns empty string when blob is not set', () => {
      element.blob = null;
      expect(element.driveEditURL).to.equal('');
    });

    test('returns empty string when blob is undefined', () => {
      element.blob = undefined;
      expect(element.driveEditURL).to.equal('');
    });
  });
});