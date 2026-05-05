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
import '../elements/nuxeo-cloud-services/nuxeo-cloud-providers.js';

suite('nuxeo-cloud-providers', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-cloud-providers></nuxeo-cloud-providers>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_addEntry', () => {
    test('should initialize new entry with defaults', () => {
      element._addEntry();
      expect(element._isNew).to.be.true;
      expect(element._selectedEntry).to.exist;
      expect(element._selectedEntry['entity-type']).to.equal('nuxeoOAuth2ServiceProvider');
      expect(element._selectedEntry.isEnabled).to.be.false;
    });
  });

  suite('_editEntry', () => {
    test('should clone entry and convert scopes array to string', () => {
      const item = {
        serviceName: 'google',
        scopes: ['email', 'profile'],
        isEnabled: true,
        'entity-type': 'nuxeoOAuth2ServiceProvider',
      };
      const mockEvent = { target: { parentNode: { item } } };
      element._editEntry(mockEvent);
      expect(element._isNew).to.be.false;
      expect(element._selectedEntry.scopes).to.equal('email,profile');
      expect(element._selectedServiceName).to.equal('google');
    });
  });

  suite('_computeDialogHeading', () => {
    test('should return add heading for new entry', () => {
      element._isNew = true;
      expect(element._computeDialogHeading()).to.equal('cloudProviders.popup.addEntry');
    });

    test('should return edit heading for existing entry', () => {
      element._isNew = false;
      expect(element._computeDialogHeading()).to.equal('cloudProviders.popup.editEntry');
    });
  });

  suite('_save', () => {
    test('should call _create for new entry when form is valid', () => {
      element._isNew = true;
      element._selectedEntry = { 'entity-type': 'nuxeoOAuth2ServiceProvider', scopes: 'email,profile' };
      sinon.stub(element.$.form, 'validate').returns(true);
      sinon.stub(element, '_create');
      element._save();
      expect(element._selectedEntry.scopes).to.deep.equal(['email', 'profile']);
      expect(element._create).to.have.been.calledOnce;
    });

    test('should call _update for existing entry when form is valid', () => {
      element._isNew = false;
      element._selectedServiceName = 'google';
      element._selectedEntry = { 'entity-type': 'nuxeoOAuth2ServiceProvider', scopes: '' };
      sinon.stub(element.$.form, 'validate').returns(true);
      sinon.stub(element, '_update');
      element._save();
      expect(element._selectedEntry.scopes).to.deep.equal([]);
      expect(element._update).to.have.been.calledWith('google', element._selectedEntry);
    });

    test('should not proceed when form is invalid', () => {
      sinon.stub(element.$.form, 'validate').returns(false);
      sinon.stub(element, '_create');
      element._save();
      expect(element._create).to.not.have.been.called;
    });
  });

  suite('_deleteEntry', () => {
    test('should call remove when user confirms', () => {
      sinon.stub(window, 'confirm').returns(true);
      sinon.stub(element.$.oauth, 'remove').resolves();
      sinon.stub(element, 'refresh');
      sinon.stub(element, 'notify');
      const evt = { target: { parentNode: { item: { serviceName: 'google' } } } };
      element._deleteEntry(evt);
      expect(element.$.oauth.path).to.include('google');
      window.confirm.restore();
    });

    test('should not call remove when user cancels', () => {
      sinon.stub(window, 'confirm').returns(false);
      const spy = sinon.spy(element.$.oauth, 'remove');
      element._deleteEntry({ target: { parentNode: { item: { serviceName: 'test' } } } });
      expect(spy).to.not.have.been.called;
      window.confirm.restore();
    });
  });
});
