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
import '@polymer/iron-icon/iron-icon.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-input.js';
import '../elements/nuxeo-easyshare-share-link.js';

suite('nuxeo-easyshare-share-link', () => {
  let element;
  let writeText;

  // navigator.clipboard is an accessor on Navigator.prototype, so shadow it with an own property
  // and delete that property on teardown to put the real one back.
  const setClipboard = (clipboard) => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
  };

  const copyFromPermalink = () => element._copyLink({ currentTarget: element.$.permalinkIcon });

  setup(async () => {
    element = await fixture(html`<nuxeo-easyshare-share-link></nuxeo-easyshare-share-link>`);
    element.document = { uid: 'doc-1', type: 'File', properties: { 'dc:title': 'Report' } };
    await flush();
    sinon.stub(element, 'notify');
    sinon.stub(element, 'i18n').callsFake((key) => key);
    writeText = sinon.stub().returns(Promise.resolve());
    setClipboard({ writeText });
  });

  teardown(() => {
    delete navigator.clipboard;
  });

  suite('_copyLink', () => {
    test('should write the permalink to the clipboard', async () => {
      await copyFromPermalink();
      expect(writeText).to.have.been.calledOnce;
      expect(writeText.firstCall.args[0]).to.equal(element._buildPermalink(element.document));
    });

    test('should show the copied feedback only once the write has resolved', async () => {
      let resolveWrite;
      writeText.returns(
        new Promise((resolve) => {
          resolveWrite = resolve;
        }),
      );

      const copied = copyFromPermalink();
      expect(element.$.permalinkIcon.icon).to.equal('link');
      expect(element.notify).to.not.have.been.called;

      resolveWrite();
      await copied;

      expect(element.$.permalinkIcon.icon).to.equal('check');
      expect(element.$.permalinkIcon.classList.contains('selected')).to.be.true;
      expect(element.notify).to.have.been.calledWithMatch({ message: 'shareButton.operation.copied' });
    });

    test('should surface a rejected clipboard write instead of swallowing it', async () => {
      writeText.returns(Promise.reject(new DOMException('Write permission denied', 'NotAllowedError')));

      await copyFromPermalink();

      expect(element.notify).to.have.been.calledWithMatch({ message: 'easyshare.copy.error' });
      expect(element.$.permalinkIcon.icon).to.equal('link');
      expect(element.$.permalinkIcon.classList.contains('selected')).to.be.false;
    });

    test('should report that copying needs a secure context when the Clipboard API is absent', async () => {
      setClipboard(undefined);

      await copyFromPermalink();

      expect(element.notify).to.have.been.calledWithMatch({ message: 'easyshare.copy.unavailable' });
      expect(writeText).to.not.have.been.called;
      expect(element.$.permalinkIcon.icon).to.equal('link');
    });

    test('should leave the link selected so it can still be copied by hand', async () => {
      setClipboard(undefined);
      const input = element.$.permalink.$.paperInput.$.nativeInput;

      await copyFromPermalink();

      expect(input.value).to.equal(element._buildPermalink(element.document));
      expect(input.selectionStart).to.equal(0);
      expect(input.selectionEnd).to.equal(input.value.length);
    });

    test('should flush the pending feedback of the other copy button', async () => {
      element.document = { uid: 'doc-2', type: 'EasyShareFolder', properties: { 'dc:title': 'Shared' } };
      await flush();
      const easyShareIcon = element.$$('#easyShareIcon');
      const debouncerFlush = sinon.spy();
      element.$.permalinkIcon._debouncer = { isActive: () => true, flush: debouncerFlush };

      await element._copyLink({ currentTarget: easyShareIcon });

      expect(debouncerFlush).to.have.been.calledOnce;
      expect(easyShareIcon.icon).to.equal('check');
    });
  });

  suite('links', () => {
    test('should build a permalink to the document', () => {
      const base = window.location.origin + window.location.pathname;
      expect(element._buildPermalink({ uid: 'doc-1' })).to.equal(`${base}#!/doc/doc-1`);
    });

    test('should return an empty permalink when there is no document', () => {
      expect(element._buildPermalink(null)).to.equal('');
    });

    test('should build an easyshare link from the connection url', () => {
      element.$.nxcon.url = '/nuxeo';
      expect(element._buildEasysharelink(element.document)).to.equal(
        `${window.location.origin}/nuxeo/site/easyshare/doc-1`,
      );
    });

    test('should return an empty easyshare link when there is no document', () => {
      element.$.nxcon.url = '/nuxeo';
      expect(element._buildEasysharelink(null)).to.equal('');
    });
  });

  suite('availability', () => {
    test('should only be available for a document', () => {
      expect(element._isAvailable(element.document)).to.be.ok;
      expect(element._isAvailable(null)).to.not.be.ok;
    });

    test('should only offer the easyshare link on an EasyShareFolder', () => {
      expect(element._isEasyshare({ type: 'EasyShareFolder' })).to.be.true;
      expect(element._isEasyshare({ type: 'File' })).to.be.false;
      expect(element._isEasyshare(null)).to.not.be.ok;
    });

    test('should label the action from the shared translation key', () => {
      expect(element._computeLabel()).to.equal('shareButton.tooltip');
    });
  });
});
