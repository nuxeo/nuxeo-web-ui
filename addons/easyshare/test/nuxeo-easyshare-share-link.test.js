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
import '../elements/nuxeo-easyshare-share-link.js';

suite('nuxeo-easyshare-share-link', () => {
  let server;
  let element;

  // `_copyLink` only reads `currentTarget`, its previous sibling and a couple of DOM APIs,
  // so a stand-in avoids stamping the whole dialog.
  const fakeShareButton = (id) => {
    return {
      id,
      previousElementSibling: {
        $: {
          paperInput: {
            $: { nativeInput: { select: sinon.spy(), setSelectionRange: sinon.spy() } },
            blur: sinon.spy(),
          },
        },
      },
      classList: { add: sinon.spy(), remove: sinon.spy() },
      set: sinon.spy(),
    };
  };

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-easyshare-share-link></nuxeo-easyshare-share-link>`);
    await flush();
    sinon.stub(element, 'notify');
  });

  teardown(() => {
    server.restore();
  });

  suite('_isEasyshare', () => {
    test('should return true for an EasyShareFolder', () => {
      expect(element._isEasyshare({ type: 'EasyShareFolder' })).to.be.true;
    });

    test('should return false for any other document type', () => {
      expect(element._isEasyshare({ type: 'File' })).to.be.false;
    });

    test('should return false when there is no document', () => {
      expect(element._isEasyshare(null)).to.be.false;
      expect(element._isEasyshare(undefined)).to.be.false;
    });
  });

  suite('_copyLink', () => {
    setup(() => {
      sinon.stub(window.document, 'execCommand').returns(true);
    });

    teardown(() => {
      window.document.execCommand.restore();
    });

    test('should select the link and mark the button as copied', () => {
      const shareButton = fakeShareButton('permalinkIcon');
      element._copyLink({ currentTarget: shareButton });

      expect(shareButton.previousElementSibling.$.paperInput.$.nativeInput.select).to.have.been.calledOnce;
      expect(shareButton.set).to.have.been.calledWith('icon', 'check');
      expect(shareButton.classList.add).to.have.been.calledWith('selected');
      expect(element.notify).to.have.been.calledOnce;

      shareButton._debouncer.flush();
    });

    test('should leave the other share button alone when it has no pending debouncer', () => {
      const other = element.$.permalinkIcon;
      expect(other._debouncer).to.not.be.ok;

      const shareButton = fakeShareButton('easyShareIcon');
      element._copyLink({ currentTarget: shareButton });

      expect(other._debouncer).to.not.be.ok;
      shareButton._debouncer.flush();
    });

    test('should flush a pending debouncer on the other share button', () => {
      const other = element.$.permalinkIcon;
      const flushSpy = sinon.spy();
      other._debouncer = { isActive: () => true, flush: flushSpy };

      const shareButton = fakeShareButton('easyShareIcon');
      element._copyLink({ currentTarget: shareButton });

      expect(flushSpy).to.have.been.calledOnce;
      expect(other._debouncer).to.be.undefined;
      shareButton._debouncer.flush();
    });

    test('should bail out when the copy command fails', () => {
      window.document.execCommand.returns(false);
      const shareButton = fakeShareButton('permalinkIcon');

      element._copyLink({ currentTarget: shareButton });

      expect(shareButton.set).to.not.have.been.called;
      expect(element.notify).to.not.have.been.called;
      expect(shareButton._debouncer).to.be.undefined;
    });
  });
});
