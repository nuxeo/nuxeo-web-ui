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
import '../elements/nuxeo-admin/nuxeo-announcement-management.js';
import {
  ANNOUNCEMENT_ENTRY_PATH,
  ANNOUNCEMENT_ENTRY_UPDATE_PATH,
  ANNOUNCEMENT_MAX_LENGTH,
  ANNOUNCEMENT_UPDATED_EVENT,
} from '../elements/nuxeo-app/nuxeo-announcement.js';

suite('nuxeo-announcement-management', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-announcement-management></nuxeo-announcement-management>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    sinon.stub(element, 'notify');
    await flush();
  });

  teardown(() => {
    server.restore();
  });

  suite('refresh', () => {
    test('loads the existing announcement into the form', async () => {
      sinon.stub(element.$.announcement, 'get').resolves({
        entries: [
          {
            id: 'announcement',
            properties: { enabled: true, message: 'Maintenance', linkUrl: 'https://x.test', linkLabel: 'Info' },
          },
        ],
      });
      await element.refresh();
      expect(element._exists).to.be.true;
      expect(element._entry).to.deep.equal({
        enabled: true,
        message: 'Maintenance',
        linkUrl: 'https://x.test',
        linkLabel: 'Info',
      });
    });

    test('starts from an empty announcement when none exists yet', async () => {
      sinon.stub(element.$.announcement, 'get').resolves({ entries: [] });
      await element.refresh();
      expect(element._exists).to.be.false;
      expect(element._entry).to.deep.equal({ enabled: false, message: '', linkUrl: '', linkLabel: '' });
    });

    test('ignores an entry that is not the reserved announcement', async () => {
      sinon.stub(element.$.announcement, 'get').resolves({
        entries: [{ id: 'something-else', properties: { enabled: true, message: 'Not an announcement' } }],
      });
      await element.refresh();
      expect(element._exists).to.be.false;
      expect(element._entry).to.deep.equal({ enabled: false, message: '', linkUrl: '', linkLabel: '' });
    });

    test('disables the form while loading and re-enables it once settled', async () => {
      let resolve;
      sinon.stub(element.$.announcement, 'get').returns(
        new Promise((r) => {
          resolve = r;
        }),
      );
      const pending = element.refresh();
      expect(element._loading).to.be.true;
      resolve({ entries: [] });
      await pending;
      expect(element._loading).to.be.false;
    });

    test('re-enables the form when loading fails', async () => {
      sinon.stub(element.$.announcement, 'get').rejects(new Error('boom'));
      await element.refresh();
      expect(element._loading).to.be.false;
    });

    test('notifies the user when loading fails', async () => {
      sinon.stub(element.$.announcement, 'get').rejects(new Error('boom'));
      await element.refresh();
      expect(element.notify).to.have.been.calledOnce;
    });

    test('is triggered when the page becomes visible', async () => {
      const refresh = sinon.stub(element, 'refresh').resolves();
      element.visible = true;
      expect(refresh).to.have.been.calledOnce;
    });
  });

  suite('_save', () => {
    setup(() => {
      sinon.stub(element.$.form, 'validate').returns(true);
    });

    test('creates the announcement when it does not exist yet', async () => {
      element._exists = false;
      element._entry = { enabled: true, message: ' Maintenance ', linkUrl: '', linkLabel: '' };
      const post = sinon.stub(element.$.announcement, 'post').resolves();
      await element._save();
      expect(element.$.announcement.path).to.equal(ANNOUNCEMENT_ENTRY_PATH);
      expect(post).to.have.been.calledOnce;
      expect(element.$.announcement.data.properties.message).to.equal('Maintenance');
      expect(element._exists).to.be.true;
    });

    test('updates the announcement when it already exists', async () => {
      element._exists = true;
      element._entry = { enabled: false, message: 'Maintenance', linkUrl: '', linkLabel: '' };
      const put = sinon.stub(element.$.announcement, 'put').resolves();
      await element._save();
      expect(element.$.announcement.path).to.equal(ANNOUNCEMENT_ENTRY_UPDATE_PATH);
      expect(put).to.have.been.calledOnce;
    });

    test('notifies the banner once saved', async () => {
      element._exists = true;
      element._entry = { enabled: true, message: 'Maintenance', linkUrl: '', linkLabel: '' };
      sinon.stub(element.$.announcement, 'put').resolves();
      const listener = sinon.spy();
      document.addEventListener(ANNOUNCEMENT_UPDATED_EVENT, listener);
      await element._save();
      document.removeEventListener(ANNOUNCEMENT_UPDATED_EVENT, listener);
      expect(listener).to.have.been.calledOnce;
    });

    test('notifies the user and keeps the form when saving fails', async () => {
      element._exists = true;
      element._entry = { enabled: true, message: 'Maintenance', linkUrl: '', linkLabel: '' };
      sinon.stub(element.$.announcement, 'put').rejects(new Error('boom'));
      await element._save();
      expect(element.notify).to.have.been.calledOnce;
    });

    test('rejects an enabled announcement without a message', async () => {
      element._entry = { enabled: true, message: '   ', linkUrl: '', linkLabel: '' };
      const put = sinon.stub(element.$.announcement, 'put');
      const post = sinon.stub(element.$.announcement, 'post');
      await element._save();
      expect(put).to.not.have.been.called;
      expect(post).to.not.have.been.called;
      expect(element._messageInvalid).to.be.true;
    });

    test('rejects a message longer than the directory column', async () => {
      element._entry = { enabled: true, message: 'a'.repeat(ANNOUNCEMENT_MAX_LENGTH + 1), linkUrl: '', linkLabel: '' };
      const post = sinon.stub(element.$.announcement, 'post');
      await element._save();
      expect(post).to.not.have.been.called;
      expect(element._messageInvalid).to.be.true;
    });

    test('rejects an unsafe link', async () => {
      // eslint-disable-next-line no-script-url
      element._entry = { enabled: true, message: 'Maintenance', linkUrl: 'javascript:alert(1)', linkLabel: '' };
      const post = sinon.stub(element.$.announcement, 'post');
      await element._save();
      expect(post).to.not.have.been.called;
      expect(element.notify).to.have.been.calledOnce;
    });

    test('allows turning the banner off with an empty message', async () => {
      element._exists = true;
      element._entry = { enabled: false, message: '', linkUrl: '', linkLabel: '' };
      const put = sinon.stub(element.$.announcement, 'put').resolves();
      await element._save();
      expect(put).to.have.been.calledOnce;
      expect(element._messageInvalid).to.be.false;
    });

    test('does nothing while the announcement is still loading', async () => {
      element._loading = true;
      element._entry = { enabled: true, message: 'Maintenance', linkUrl: '', linkLabel: '' };
      const put = sinon.stub(element.$.announcement, 'put');
      const post = sinon.stub(element.$.announcement, 'post');
      await element._save();
      expect(put).to.not.have.been.called;
      expect(post).to.not.have.been.called;
    });
  });
});
