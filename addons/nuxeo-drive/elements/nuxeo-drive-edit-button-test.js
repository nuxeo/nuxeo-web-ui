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

  suite('_openDriveUrl — Drive detection (blur + debounce heuristic)', () => {
    const DRIVE_URL =
      'nxdrive://edit/localhost/user/Administrator/repo/default/nxdocid/doc-uid-1/filename/test.docx/downloadUrl/nxfile/default/doc-uid-1/file:content/test.docx';
    let clock;
    let dialogToggleStub;

    setup(() => {
      clock = sinon.useFakeTimers();
      // Stub _navigate so no real protocol navigation happens in Karma
      sinon.stub(element, '_navigate');
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
      dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
    });

    teardown(() => {
      // Advance past hard-cap to ensure cleanup() fires and all window listeners are removed
      clock.tick(10000);
      clock.restore();
      sinon.restore();
    });

    test('opens install dialog after timeout when no blur fires (Drive not installed)', () => {
      element._openDriveUrl(DRIVE_URL);

      // No blur fired at all — Drive is not installed
      clock.tick(1500);

      expect(dialogToggleStub).to.have.been.calledOnce;
    });

    test('does not open dialog when blur fires and stays (Drive opened normally)', () => {
      element._openDriveUrl(DRIVE_URL);

      // Blur fires and window stays blurred (Drive took focus — no focus event returns)
      window.dispatchEvent(new Event('blur'));
      clock.tick(300); // debounce fires — Drive confirmed
      clock.tick(1500); // primary timeout fires — but appOpened is already true

      expect(dialogToggleStub).to.not.have.been.called;
    });

    test('ignores blur when focus returns quickly (transient browser/OS dialog)', () => {
      element._openDriveUrl(DRIVE_URL);

      // Blur fires but focus returns before debounce — e.g. Chrome/Edge shows a native
      // protocol-handler dialog cancelled quickly, or browser dismissed its own prompt.
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
      clock.tick(300); // debounce would have fired — but was cancelled by focus

      clock.tick(1500); // primary timeout fires
      // onFocus set appOpened=true, so primary timeout is suppressed — no dialog
      expect(dialogToggleStub).to.not.have.been.called;
    });

    test('auto-dismisses dialog when Drive responds after the timeout (slow system)', () => {
      element._openDriveUrl(DRIVE_URL);

      // Timeout fires first — false-alarm dialog shown
      clock.tick(1500);
      expect(dialogToggleStub).to.have.been.calledOnce;

      // Drive opens late — blur fires and stays
      window.dispatchEvent(new Event('blur'));
      clock.tick(300); // debounce fires

      // Second toggle = auto-dismiss
      expect(dialogToggleStub).to.have.been.calledTwice;
    });

    test('detects Drive on second blur when first was a transient browser/OS dialog', () => {
      element._openDriveUrl(DRIVE_URL);

      // First blur is transient (browser/OS prompt cancelled) — focus returns quickly
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus')); // cancels debounce

      // Drive opens — second blur fires and stays
      window.dispatchEvent(new Event('blur'));
      clock.tick(300); // debounce fires — Drive confirmed
      clock.tick(1500); // primary timeout — appOpened already true

      expect(dialogToggleStub).to.not.have.been.called;
    });

    test('cleans up listeners after hard-cap timeout', () => {
      const removeSpy = sinon.spy(window, 'removeEventListener');

      element._openDriveUrl(DRIVE_URL);

      clock.tick(1500 + 3000); // hard-cap fires

      expect(removeSpy.called).to.be.true;
      removeSpy.restore();
    });

    test('shows install dialog when OS protocol dialog is dismissed (Drive not installed, tokens exist)', () => {
      // Scenario: Drive is uninstalled but server tokens remain. The OS shows a
      // protocol-handler confirmation dialog — window blurs, debounce fires
      // (appOpened=true), then focus returns when the user dismisses the OS dialog.
      element._openDriveUrl(DRIVE_URL);

      // OS protocol dialog opens — window blurs and stays blurred past debounce
      window.dispatchEvent(new Event('blur'));
      clock.tick(300); // debounce fires → appOpened=true, onFocusAfterOpened registered

      // User dismisses the OS "file not found" dialog — window regains focus
      window.dispatchEvent(new Event('focus'));

      // Install dialog must now be shown
      expect(dialogToggleStub).to.have.been.calledOnce;
    });

    test('does not double-show install dialog when OS dialog dismissed after primary timeout', () => {
      // Slow system: primary timeout fires first (dialogShown=true), then the OS
      // dialog is dismissed. onFocusAfterOpened should not open a second dialog.
      element._openDriveUrl(DRIVE_URL);

      // Primary timeout fires before any blur
      clock.tick(1500);
      expect(dialogToggleStub).to.have.been.calledOnce;

      // OS dialog then blurs the window and focus returns
      window.dispatchEvent(new Event('blur'));
      clock.tick(300); // debounce → appOpened=true
      window.dispatchEvent(new Event('focus'));

      // Second call = auto-dismiss (not a second open)
      expect(dialogToggleStub).to.have.been.calledTwice;
    });

    suite('Firefox behaviour (no blur when Drive is absent)', () => {
      let originalUserAgent;

      setup(() => {
        originalUserAgent = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent');
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (X11; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0',
          configurable: true,
        });
      });

      teardown(() => {
        if (originalUserAgent) {
          Object.defineProperty(Navigator.prototype, 'userAgent', originalUserAgent);
        } else {
          delete navigator.userAgent;
        }
      });

      test('shows install dialog via primary timeout when no blur fires (Firefox, Drive absent)', () => {
        element._openDriveUrl(DRIVE_URL);

        clock.tick(1500);

        expect(dialogToggleStub).to.have.been.calledOnce;
      });

      test('does not show install dialog when blur fires and stays (Firefox, Drive opened)', () => {
        element._openDriveUrl(DRIVE_URL);

        window.dispatchEvent(new Event('blur'));
        clock.tick(300); // debounce fires
        clock.tick(1500); // primary timeout — appOpened already true

        expect(dialogToggleStub).to.not.have.been.called;
      });

      test('does not show install dialog when focus returns after blur debounce (Firefox — no onFocusAfterOpened)', () => {
        element._openDriveUrl(DRIVE_URL);

        window.dispatchEvent(new Event('blur'));
        clock.tick(300); // debounce fires
        window.dispatchEvent(new Event('focus')); // user returns from Drive

        clock.tick(1500); // primary timeout — appOpened already true

        expect(dialogToggleStub).to.not.have.been.called;
      });
    });
  });

  // ---------------------------------------------------------------------------
  // _navigate
  // ---------------------------------------------------------------------------
  suite('_navigate', () => {
    teardown(() => {
      sinon.restore();
    });

    test('appends an anchor to document.body, clicks it, then removes it', () => {
      const appendSpy = sinon.spy(document.body, 'appendChild');
      const removeSpy = sinon.spy(document.body, 'removeChild');

      element._navigate('nxdrive://edit/localhost/user/Administrator/repo/default/nxdocid/abc/filename/test.docx');

      expect(appendSpy).to.have.been.calledOnce;
      const anchor = appendSpy.firstCall.args[0];
      expect(anchor.tagName).to.equal('A');
      expect(anchor.href).to.include('nxdrive');
      expect(removeSpy).to.have.been.calledOnce;
      expect(removeSpy.firstCall.args[0]).to.equal(anchor);
    });

    test('does not modify window.location', () => {
      const before = window.location.href;
      element._navigate('nxdrive://edit/localhost/user/Administrator/repo/default/nxdocid/abc/filename/test.docx');
      expect(window.location.href).to.equal(before);
    });

    test('anchor has aria-hidden and tabindex=-1 (accessible)', () => {
      const appendSpy = sinon.spy(document.body, 'appendChild');
      element._navigate('nxdrive://edit/localhost/user/Administrator/repo/default/nxdocid/abc/filename/test.docx');
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
});