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
    const DRIVE_URL = 'nxdrive://edit/localhost/user/Administrator/repo/default/nxdocid/doc-uid-1/filename/test.docx/downloadUrl/nxfile/default/doc-uid-1/file:content/test.docx';
    let clock;
    let dialogToggleStub;

    setup(() => {
      clock = sinon.useFakeTimers();
      element.$.dialog.toggle = element.$.dialog.toggle || function () {};
      dialogToggleStub = sinon.stub(element.$.dialog, 'toggle');
    });

    teardown(() => {
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

    test('ignores blur when focus returns quickly (Chrome false-positive)', () => {
      element._openDriveUrl(DRIVE_URL);

      // Blur fires but focus returns before debounce (Chrome protocol prompt, no Drive)
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
      clock.tick(300); // debounce would have fired — but was cancelled by focus

      clock.tick(1500); // primary timeout fires
      expect(dialogToggleStub).to.have.been.calledOnce;
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

    test('cleans up listeners after hard-cap timeout', () => {
      const removeSpy = sinon.spy(window, 'removeEventListener');

      element._openDriveUrl(DRIVE_URL);

      clock.tick(1500 + 3000); // hard-cap fires

      expect(removeSpy.called).to.be.true;
      removeSpy.restore();
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
