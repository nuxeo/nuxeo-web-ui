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
import '../elements/nuxeo-liveconnect-google-drive-provider.js';

suite('nuxeo-liveconnect-google-drive-provider', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-liveconnect-google-drive-provider></nuxeo-liveconnect-google-drive-provider>`);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should have providerId set to googledrive', () => {
      expect(element.providerId).to.equal('googledrive');
    });

    test('should default isUserAuthorized to false', () => {
      expect(element.isUserAuthorized).to.be.false;
    });

    test('should default isAvailable to false', () => {
      expect(element.isAvailable).to.be.false;
    });
  });

  suite('_parseMessage', () => {
    test('should parse JSON and set accessToken', () => {
      const event = { data: JSON.stringify({ token: 'my-access-token' }) };
      element._parseMessage(event);
      expect(element.accessToken).to.equal('my-access-token');
    });
  });

  suite('openPicker', () => {
    test('should load the picker api and call init callback', () => {
      const initStub = sinon.stub(element, '_init');
      window.gapi = {
        load: sinon.stub().callsFake((_name, options) => {
          options.callback();
        }),
      };
      element.openPicker();
      expect(window.gapi.load).to.have.been.calledWith('picker', sinon.match.object);
      expect(initStub).to.have.been.calledOnce;
      delete window.gapi;
    });
  });

  suite('_init', () => {
    test('should open OAuth popup when user is not authorized', async () => {
      element.isUserAuthorized = false;
      element.authorizationURL = 'https://auth.example.com';
      sinon.stub(element, 'updateProviderInfo').resolves();
      const popupStub = sinon.stub(element, 'openPopup');
      await element._init();
      expect(popupStub).to.have.been.calledOnce;
    });

    test('should start immediate auth when user is authorized', async () => {
      element.isUserAuthorized = true;
      sinon.stub(element, 'updateProviderInfo').resolves();
      const doAuthStub = sinon.stub(element, '_doAuth');
      await element._init();
      expect(doAuthStub).to.have.been.calledWith(true, sinon.match.func);
    });
  });

  suite('_doAuth', () => {
    test('should call gapi authorize with user and domain', () => {
      window.gapi = { auth: { authorize: sinon.spy() } };
      element.clientId = 'client-id';
      element.userId = 'john';
      element.domain = 'example.com';
      const callback = sinon.spy();
      element._doAuth(true, callback);
      expect(window.gapi.auth.authorize).to.have.been.calledWith(
        sinon.match({
          client_id: 'client-id',
          user_id: 'john',
          immediate: true,
          hd: 'example.com',
        }),
        callback,
      );
      delete window.gapi;
    });

    test('should request account chooser when user is missing', () => {
      window.gapi = { auth: { authorize: sinon.spy() } };
      element.clientId = 'client-id';
      element.userId = '';
      element.domain = '';
      element._doAuth(false, sinon.spy());
      const authOptions = window.gapi.auth.authorize.firstCall.args[0];
      expect(authOptions.authuser).to.equal(-1);
      expect(authOptions).to.not.have.property('user_id');
      expect(authOptions).to.not.have.property('immediate');
      delete window.gapi;
    });
  });

  suite('_onOAuthPopupClose', () => {
    test('should call _handleAuthResult when accessToken exists', () => {
      const stub = sinon.stub(element, '_handleAuthResult');
      element.accessToken = 'test-token';
      element._onOAuthPopupClose();
      expect(stub).to.have.been.calledWith('test-token');
    });

    test('should not call _handleAuthResult when accessToken is falsy', () => {
      const stub = sinon.stub(element, '_handleAuthResult');
      element.accessToken = null;
      element._onOAuthPopupClose();
      expect(stub).to.not.have.been.called;
    });
  });

  suite('_checkAuth', () => {
    test('should call _handleAuthResult when gapi token exists', () => {
      const stub = sinon.stub(element, '_handleAuthResult');
      window.gapi = {
        auth: {
          getToken: () => {
            return { access_token: 'gapi-token' };
          },
        },
      };
      element._checkAuth();
      expect(stub).to.have.been.calledWith('gapi-token');
      delete window.gapi;
    });

    test('should retry with _doAuth when no gapi token', () => {
      const doAuthStub = sinon.stub(element, '_doAuth');
      window.gapi = { auth: { getToken: () => null } };
      element._checkAuth();
      expect(doAuthStub).to.have.been.calledWith(false);
      delete window.gapi;
    });
  });

  suite('_handleAuthResult', () => {
    test('should call _checkAuth when token is falsy', () => {
      const checkStub = sinon.stub(element, '_checkAuth');
      element._handleAuthResult(null);
      expect(checkStub).to.have.been.called;
    });

    test('should fetch token info and show picker when token exists', async () => {
      const request = {
        response: { email: 'john@example.com' },
        send: sinon.stub().resolves(),
      };
      const createElement = document.createElement.bind(document);
      sinon.stub(document, 'createElement').callsFake((tagName) => {
        if (tagName === 'iron-request') {
          return request;
        }
        return createElement(tagName);
      });
      const showPickerStub = sinon.stub(element, '_showPicker');
      element._handleAuthResult('token-123');
      await request.send.firstCall.returnValue;
      expect(element.userId).to.equal('john@example.com');
      expect(showPickerStub).to.have.been.calledWith('token-123');
    });
  });

  suite('_showPicker', () => {
    test('should build a multi-select picker and show it', () => {
      const docsView = {
        setIncludeFolders: sinon.spy(),
        setOwnedByMe: sinon.spy(),
      };
      const pickerInstance = { setVisible: sinon.spy() };
      const builder = {
        setOAuthToken: sinon.stub().returnsThis(),
        setAppId: sinon.stub().returnsThis(),
        addView: sinon.stub().returnsThis(),
        setCallback: sinon.stub().returnsThis(),
        enableFeature: sinon.stub().returnsThis(),
        build: sinon.stub().returns(pickerInstance),
      };
      window.google = {
        picker: {
          DocsView: function DocsView() {
            return docsView;
          },
          PickerBuilder: function PickerBuilder() {
            return builder;
          },
          Feature: { MULTISELECT_ENABLED: 'multi' },
        },
      };
      element.clientId = 'client-id';
      element._showPicker('token-456');
      expect(docsView.setIncludeFolders).to.have.been.calledWith(true);
      expect(builder.setOAuthToken).to.have.been.calledWith('token-456');
      expect(builder.setAppId).to.have.been.calledWith('client-id');
      expect(pickerInstance.setVisible).to.have.been.calledWith(true);
      delete window.google;
    });
  });

  suite('_pickerCallback', () => {
    test('should call notifyBlobPick for PICKED action', () => {
      const notifyStub = sinon.stub(element, 'notifyBlobPick');
      element.providerId = 'googledrive';
      element.userId = 'test@example.com';
      sinon.stub(element, 'generateBlobKey').returns('googledrive:test@example.com:file1');

      window.google = {
        picker: {
          Response: { ACTION: 'action', DOCUMENTS: 'docs' },
          Action: { PICKED: 'picked' },
        },
      };

      const data = {
        action: 'picked',
        docs: [{ id: 'file1', name: 'test.pdf', sizeBytes: 1024 }],
      };

      element._pickerCallback(data);
      expect(notifyStub).to.have.been.called;
      const files = notifyStub.firstCall.args[0];
      expect(files).to.be.an('array').with.lengthOf(1);
      expect(files[0].providerId).to.equal('googledrive');
      expect(files[0].providerName).to.equal('Google Drive');
      expect(files[0].fileId).to.equal('file1');

      delete window.google;
    });

    test('should not call notifyBlobPick for non-PICKED action', () => {
      const notifyStub = sinon.stub(element, 'notifyBlobPick');

      window.google = {
        picker: {
          Response: { ACTION: 'action', DOCUMENTS: 'docs' },
          Action: { PICKED: 'picked' },
        },
      };

      element._pickerCallback({ action: 'cancel', docs: [] });
      expect(notifyStub).to.not.have.been.called;

      delete window.google;
    });
  });
});
