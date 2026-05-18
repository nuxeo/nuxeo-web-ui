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
import '../elements/nuxeo-authentication-tokens-management.js';

suite('nuxeo-authentication-tokens-management', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(
      html`<nuxeo-authentication-tokens-management application="Nuxeo Drive"></nuxeo-authentication-tokens-management>`,
    );
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default tokens to empty array', () => {
      expect(element.tokens).to.be.an('array').that.is.empty;
    });

    test('should have application property set', () => {
      expect(element.application).to.equal('Nuxeo Drive');
    });
  });

  suite('_params', () => {
    test('should return object with application', () => {
      const params = element._params('Nuxeo Drive');
      expect(params).to.deep.equal({ application: 'Nuxeo Drive' });
    });

    test('should handle null application', () => {
      const params = element._params(null);
      expect(params).to.deep.equal({ application: null });
    });
  });

  suite('_handleTokens', () => {
    test('should set tokens from response entries', () => {
      const entries = [{ id: 'token1' }, { id: 'token2' }];
      element._handleTokens({ detail: { response: { entries } } });
      expect(element.tokens).to.deep.equal(entries);
    });

    test('should handle empty entries', () => {
      element._handleTokens({ detail: { response: { entries: [] } } });
      expect(element.tokens).to.be.an('array').that.is.empty;
    });
  });

  suite('_empty', () => {
    test('should return true for empty array', () => {
      expect(element._empty([])).to.be.true;
    });

    test('should return false for non-empty array', () => {
      expect(element._empty([{ id: '1' }])).to.be.false;
    });
  });

  suite('_formatDate', () => {
    test('should format date string', () => {
      const formatted = element._formatDate('2023-01-15T12:00:00Z');
      expect(formatted).to.be.a('string');
      expect(formatted).to.include('January');
      expect(formatted).to.include('15');
      expect(formatted).to.include('2023');
    });
  });

  suite('_revoke', () => {
    test('should set token path and call remove', async () => {
      sinon.stub(element, 'refresh').returns(Promise.resolve());
      sinon.stub(element.$.toast, 'open');
      sinon.stub(element.$.token, 'remove').returns(Promise.resolve());

      const e = { model: { token: { id: 'tok123' } } };
      element._revoke(e);
      expect(element.$.token.path).to.equal('/token/tok123');
      expect(element.$.token.remove).to.have.been.called;
    });
  });

  suite('refresh', () => {
    test('should call tokens execute', () => {
      const executeStub = sinon.stub(element.$.tokens, 'execute').returns(Promise.resolve());
      element.refresh();
      expect(executeStub).to.have.been.calledWith(element);
    });
  });
});
