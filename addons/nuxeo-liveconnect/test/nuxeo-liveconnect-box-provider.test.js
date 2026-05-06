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
import '../elements/nuxeo-liveconnect-box-provider.js';

suite('nuxeo-liveconnect-box-provider', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-liveconnect-box-provider></nuxeo-liveconnect-box-provider>`);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should have providerId set to box', () => {
      expect(element.providerId).to.equal('box');
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
      const event = { data: JSON.stringify({ token: 'box-access-token' }) };
      element._parseMessage(event);
      expect(element.accessToken).to.equal('box-access-token');
    });
  });

  suite('_init', () => {
    test('should open popup when user is not authorized', () => {
      const openPopupStub = sinon.stub(element, 'openPopup');
      element.isUserAuthorized = false;
      element.authorizationURL = 'https://auth.example.com';
      element._init();
      expect(openPopupStub).to.have.been.calledWith('https://auth.example.com');
    });

    test('should show picker when user is authorized', () => {
      const showPickerStub = sinon.stub(element, '_showPicker');
      element.isUserAuthorized = true;
      element._init();
      expect(showPickerStub).to.have.been.called;
    });
  });

  suite('_onOAuthPopupClose', () => {
    test('should not act when accessToken is falsy', () => {
      const showPickerStub = sinon.stub(element, '_showPicker');
      const updateStub = sinon.stub(element, 'updateProviderInfo');
      element.accessToken = null;
      element._onOAuthPopupClose();
      expect(showPickerStub).to.not.have.been.called;
      expect(updateStub).to.not.have.been.called;
    });

    test('should call _showPicker when accessToken and userId exist', () => {
      const showPickerStub = sinon.stub(element, '_showPicker');
      element.accessToken = 'token';
      element.userId = 'user@example.com';
      element._onOAuthPopupClose();
      expect(showPickerStub).to.have.been.called;
    });

    test('should call updateProviderInfo when accessToken exists but no userId', async () => {
      element.accessToken = 'token';
      element.userId = null;
      const updateStub = sinon.stub(element, 'updateProviderInfo').returns(
        Promise.resolve().then(() => {
          element.userId = 'user@example.com';
        }),
      );
      const showPickerStub = sinon.stub(element, '_showPicker');
      element._onOAuthPopupClose();
      expect(updateStub).to.have.been.called;
      await updateStub.returnValues[0];
      expect(showPickerStub).to.have.been.called;
    });
  });
});
