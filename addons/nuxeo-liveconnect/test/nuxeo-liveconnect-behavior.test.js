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
import { LiveConnectBehavior } from '../elements/nuxeo-liveconnect-behavior.js';

suite('LiveConnectBehavior', () => {
  let behavior;

  setup(() => {
    // Create a plain object mixing in the behavior for direct method testing
    behavior = Object.create(LiveConnectBehavior);
    behavior.fire = sinon.spy();
  });

  suite('generateBlobKey', () => {
    test('should generate key from providerId, userId, and fileId', () => {
      behavior.providerId = 'googledrive';
      behavior.userId = 'user1';
      const key = behavior.generateBlobKey('file123');
      expect(key).to.equal('googledrive:user1:file123');
    });

    test('should throw when providerId is not defined', () => {
      behavior.providerId = null;
      behavior.userId = 'user1';
      expect(() => behavior.generateBlobKey('file123')).to.throw('providerId not defined');
    });

    test('should throw when userId is not defined', () => {
      behavior.providerId = 'googledrive';
      behavior.userId = null;
      expect(() => behavior.generateBlobKey('file123')).to.throw('userId not defined');
    });

    test('should throw when fileId is not defined', () => {
      behavior.providerId = 'googledrive';
      behavior.userId = 'user1';
      expect(() => behavior.generateBlobKey(null)).to.throw('fileId not defined');
    });
  });

  suite('notifyBlobPick', () => {
    test('should fire nx-blob-picked with array of blobs', () => {
      const blobs = [{ name: 'file1' }, { name: 'file2' }];
      behavior.notifyBlobPick(blobs);
      expect(behavior.fire).to.have.been.calledWith('nx-blob-picked', { blobs });
    });

    test('should wrap single blob in array', () => {
      const blob = { name: 'file1' };
      behavior.notifyBlobPick(blob);
      expect(behavior.fire).to.have.been.calledWith('nx-blob-picked', { blobs: [blob] });
    });
  });

  suite('openPicker', () => {
    test('should throw not implemented', () => {
      expect(() => behavior.openPicker()).to.throw('not implemented');
    });
  });

  suite('openPopup', () => {
    test('should open a window with correct parameters', () => {
      const fakePopup = { closed: true };
      const openStub = sinon.stub(globalThis, 'open').returns(fakePopup);
      behavior.openPopup('https://auth.example.com', {});
      expect(openStub).to.have.been.calledWith('https://auth.example.com', 'popup', sinon.match.string);
      openStub.restore();
    });

    test('should use default settings when no options given', () => {
      const fakePopup = { closed: true };
      const openStub = sinon.stub(globalThis, 'open').returns(fakePopup);
      behavior.openPopup('https://auth.example.com');
      expect(openStub).to.have.been.called;
      const args = openStub.firstCall.args[2];
      expect(args).to.include('width=1000');
      expect(args).to.include('height=650');
      openStub.restore();
    });

    test('should add message listener when onMessageReceive is provided', () => {
      const fakePopup = { closed: true };
      sinon.stub(globalThis, 'open').returns(fakePopup);
      const addListenerSpy = sinon.spy(globalThis, 'addEventListener');
      behavior.openPopup('https://auth.example.com', { onMessageReceive: sinon.spy() });
      expect(addListenerSpy).to.have.been.calledWith('message', sinon.match.func);
      addListenerSpy.restore();
      globalThis.open.restore();
    });

    test('should invoke onClose and register no listener when the popup is blocked', () => {
      sinon.stub(globalThis, 'open').returns(null);
      const addListenerSpy = sinon.spy(globalThis, 'addEventListener');
      const onClose = sinon.spy();
      behavior.openPopup('https://auth.example.com', { onClose, onMessageReceive: sinon.spy() });
      expect(onClose).to.have.been.calledOnce;
      expect(addListenerSpy).to.not.have.been.calledWith('message', sinon.match.func);
      addListenerSpy.restore();
      globalThis.open.restore();
    });
  });

  suite('openPopup message sender verification', () => {
    let onMessageReceive;
    let listener;
    let popup;

    const open = (url) => {
      popup = { closed: false };
      sinon.stub(globalThis, 'open').returns(popup);
      const addListenerStub = sinon.stub(globalThis, 'addEventListener').callsFake((type, fn) => {
        if (type === 'message') {
          listener = fn;
        }
      });
      behavior.openPopup(url, { onMessageReceive });
      addListenerStub.restore();
      globalThis.open.restore();
    };

    setup(() => {
      // openPopup polls the popup with setInterval; the fake popup never reports itself as
      // closed, so fake timers keep that interval from leaking into the rest of the run
      // (the global teardown restores the clock).
      sinon.useFakeTimers();
      onMessageReceive = sinon.spy();
      listener = null;
      popup = null;
    });

    test('should ignore messages coming from an unexpected origin', () => {
      open('https://auth.example.com');
      listener({ origin: 'https://evil.example.com', source: popup, data: '{"token":"stolen"}' });
      expect(onMessageReceive).to.not.have.been.called;
    });

    test('should ignore messages not sent by the popup it opened', () => {
      open('https://auth.example.com');
      listener({ origin: globalThis.location.origin, source: {}, data: '{"token":"stolen"}' });
      expect(onMessageReceive).to.not.have.been.called;
    });

    test('should accept messages coming from the current origin', () => {
      open('https://auth.example.com');
      const event = { origin: globalThis.location.origin, source: popup, data: '{"token":"abc"}' };
      listener(event);
      expect(onMessageReceive).to.have.been.calledWith(event);
    });

    test('should accept messages coming from the redirect_uri origin', () => {
      const redirectUri = encodeURIComponent('https://nuxeo.example.com/nuxeo/site/oauth2/box/callback');
      open(`https://auth.example.com/authorize?redirect_uri=${redirectUri}`);
      const event = { origin: 'https://nuxeo.example.com', source: popup, data: '{"token":"abc"}' };
      listener(event);
      expect(onMessageReceive).to.have.been.calledWith(event);
    });

    test('should accept messages coming from the Nuxeo server origin', () => {
      behavior.$ = { oauth2: { $: { nx: { url: 'https://server.example.com/nuxeo' } } } };
      open('https://auth.example.com');
      const event = { origin: 'https://server.example.com', source: popup, data: '{"token":"abc"}' };
      listener(event);
      expect(onMessageReceive).to.have.been.calledWith(event);
    });

    test('should resolve a relative Nuxeo server url against the current origin', () => {
      behavior.$ = { oauth2: { $: { nx: { url: '/nuxeo' } } } };
      open('https://auth.example.com');
      listener({ origin: globalThis.location.origin, source: popup, data: '{"token":"abc"}' });
      expect(onMessageReceive).to.have.been.calledOnce;
    });

    // org.nuxeo.ecm.contextPath only changes the path, so the origin to trust is unaffected by it
    test('should accept messages when the server runs on a non-default context path', () => {
      behavior.$ = { oauth2: { $: { nx: { url: '/mycms' } } } };
      const redirectUri = encodeURIComponent('https://nuxeo.example.com/mycms/site/oauth2/googledrive/callback');
      open(`https://auth.example.com/authorize?redirect_uri=${redirectUri}`);
      const event = { origin: 'https://nuxeo.example.com', source: popup, data: '{"token":"abc"}' };
      listener(event);
      expect(onMessageReceive).to.have.been.calledWith(event);
    });
  });

  suite('updateProviderInfo', () => {
    test('should throw when oauth2 element is missing', () => {
      behavior.$ = {};
      expect(() => behavior.updateProviderInfo()).to.throw('Missing OAuth2 resource');
    });

    test('should set path and fetch provider info', async () => {
      const response = {
        clientId: 'client-123',
        authorizationURL: 'https://auth.url',
        isAuthorized: true,
        userId: 'user@test.com',
        isAvailable: true,
      };
      const getStub = sinon.stub().returns(Promise.resolve(response));
      behavior.$ = { oauth2: { path: '', get: getStub } };
      behavior.providerId = 'googledrive';
      await behavior.updateProviderInfo();
      expect(behavior.$.oauth2.path).to.equal('oauth2/provider/googledrive');
      expect(behavior.clientId).to.equal('client-123');
      expect(behavior.authorizationURL).to.equal('https://auth.url');
      expect(behavior.isUserAuthorized).to.be.true;
      expect(behavior.userId).to.equal('user@test.com');
      expect(behavior.isAvailable).to.be.true;
    });
  });

  suite('getToken', () => {
    test('should throw when oauth2 element is missing', () => {
      behavior.$ = {};
      expect(() => behavior.getToken()).to.throw('Missing OAuth2 resource');
    });

    test('should set token path and call get', () => {
      const getStub = sinon.stub().returns(Promise.resolve({ token: 'abc' }));
      behavior.$ = { oauth2: { path: '', get: getStub } };
      behavior.providerId = 'box';
      behavior.getToken();
      expect(behavior.$.oauth2.path).to.equal('oauth2/provider/box/token');
      expect(getStub).to.have.been.called;
    });
  });
});
