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
import '../elements/nuxeo-app/nuxeo-announcement-banner.js';
import { ANNOUNCEMENT_UPDATED_EVENT } from '../elements/nuxeo-app/nuxeo-announcement.js';

const entries = (properties) => {
  return {
    'entity-type': 'directoryEntries',
    entries: [{ 'entity-type': 'directoryEntry', id: 'announcement', properties }],
  };
};

suite('nuxeo-announcement-banner', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-announcement-banner></nuxeo-announcement-banner>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    await flush();
  });

  teardown(() => {
    document.documentElement.style.removeProperty('--nuxeo-app-top');
    server.restore();
  });

  const load = (properties) => {
    sinon.stub(element.$.announcement, 'get').resolves(properties ? entries(properties) : { entries: [] });
    element.user = { id: 'Administrator' };
    return element.refresh().then(() => flush());
  };

  test('stays hidden until a user is connected', () => {
    const get = sinon.stub(element.$.announcement, 'get').resolves(entries({ enabled: true, message: 'Hello' }));
    return element.refresh().then(() => {
      expect(get).to.not.have.been.called;
      expect(element._opened).to.be.false;
    });
  });

  test('shows the message when the announcement is enabled', async () => {
    await load({ enabled: true, message: '  Maintenance tonight  ' });
    expect(element._opened).to.be.true;
    expect(element._message).to.equal('Maintenance tonight');
  });

  test('stays hidden when the announcement is disabled', async () => {
    await load({ enabled: false, message: 'Maintenance tonight' });
    expect(element._opened).to.be.false;
  });

  test('stays hidden when the message is blank', async () => {
    await load({ enabled: true, message: '   ' });
    expect(element._opened).to.be.false;
  });

  test('stays hidden when there is no announcement at all', async () => {
    await load(null);
    expect(element._opened).to.be.false;
  });

  test('stays hidden when the lookup fails', async () => {
    sinon.stub(element.$.announcement, 'get').rejects(new Error('404'));
    element.user = { id: 'Administrator' };
    await element.refresh();
    await flush();
    expect(element._opened).to.be.false;
  });

  test('renders the configured link with its label', async () => {
    await load({
      enabled: true,
      message: 'Maintenance tonight',
      linkUrl: 'https://status.example.com/42',
      linkLabel: 'Read more',
    });
    expect(element._linkUrl).to.equal('https://status.example.com/42');
    expect(element._linkLabel).to.equal('Read more');
  });

  test('falls back to a default link label', async () => {
    await load({ enabled: true, message: 'Maintenance tonight', linkUrl: 'https://status.example.com/42' });
    expect(element._linkLabel).to.equal('announcementBanner.moreDetails');
  });

  test('drops unsafe links', async () => {
    // eslint-disable-next-line no-script-url
    await load({ enabled: true, message: 'Maintenance tonight', linkUrl: 'javascript:alert(1)' });
    expect(element._opened).to.be.true;
    expect(element._linkUrl).to.equal('');
    expect(element._linkLabel).to.equal('');
  });

  test('reserves vertical space through --nuxeo-app-top while displayed', async () => {
    await load({ enabled: true, message: 'Maintenance tonight' });
    expect(document.documentElement.style.getPropertyValue('--nuxeo-app-top')).to.match(/^\d+(\.\d+)?px$/);
    element._opened = false;
    expect(document.documentElement.style.getPropertyValue('--nuxeo-app-top')).to.equal('');
  });

  test('refreshes when an administrator saves the announcement', async () => {
    await load({ enabled: false, message: '' });
    const refresh = sinon.spy(element, 'refresh');
    document.dispatchEvent(new CustomEvent(ANNOUNCEMENT_UPDATED_EVENT));
    await flush();
    expect(refresh).to.have.been.calledOnce;
  });

  test('hides the banner when the user is disconnected', async () => {
    await load({ enabled: true, message: 'Maintenance tonight' });
    expect(element._opened).to.be.true;
    element.user = null;
    expect(element._opened).to.be.false;
  });

  test('leaves no stale anchor behind when the link is removed', async () => {
    await load({ enabled: true, message: 'With a link', linkUrl: 'https://x.test/a', linkLabel: 'Details' });
    expect(element.shadowRoot.querySelector('a')).to.exist;
    element.$.announcement.get.restore();
    sinon.stub(element.$.announcement, 'get').resolves(entries({ enabled: true, message: 'Link removed' }));
    await element.refresh();
    await flush();
    expect(element._linkUrl).to.equal('');
    expect(element.shadowRoot.querySelector('a')).to.not.exist;
  });

  test('ignores an entry that is not the reserved announcement', async () => {
    sinon.stub(element.$.announcement, 'get').resolves({
      entries: [{ id: 'something-else', properties: { enabled: true, message: 'Not an announcement' } }],
    });
    element.user = { id: 'Administrator' };
    await element.refresh();
    await flush();
    expect(element._opened).to.be.false;
  });

  suite('overlapping lookups', () => {
    let resolvers;

    setup(() => {
      resolvers = [];
      sinon.stub(element.$.announcement, 'get').callsFake(
        () =>
          new Promise((resolve) => {
            resolvers.push(resolve);
          }),
      );
      element.user = { id: 'Administrator' };
    });

    test('keeps the newest response when an older one resolves last', async () => {
      const first = element.refresh();
      const second = element.refresh();
      // resolve the newest first, then let the superseded one land
      resolvers[resolvers.length - 1](entries({ enabled: true, message: 'Newest' }));
      resolvers[resolvers.length - 2](entries({ enabled: true, message: 'Stale' }));
      await Promise.all([first, second]);
      await flush();
      expect(element._message).to.equal('Newest');
    });

    test('drops a response that arrives after the user is disconnected', async () => {
      const pending = element.refresh();
      element.user = null;
      resolvers[resolvers.length - 1](entries({ enabled: true, message: 'Too late' }));
      await pending;
      await flush();
      expect(element._opened).to.be.false;
      expect(element._message).to.equal('');
    });

    test('drops a response that arrives after the banner is detached', async () => {
      const pending = element.refresh();
      element.detached();
      resolvers[resolvers.length - 1](entries({ enabled: true, message: 'Too late' }));
      await pending;
      await flush();
      expect(element._opened).to.be.false;
    });
  });
});
