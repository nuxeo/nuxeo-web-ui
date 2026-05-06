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
