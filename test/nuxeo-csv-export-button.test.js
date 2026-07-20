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
import '../elements/nuxeo-csv-export/nuxeo-csv-export-button.js';

suite('nuxeo-csv-export-button', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-csv-export-button></nuxeo-csv-export-button>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default pollInterval to 1000', () => {
      expect(element.pollInterval).to.equal(1000);
    });

    test('should default showLabel to false', () => {
      expect(element.showLabel).to.be.false;
    });
  });

  suite('_params', () => {
    test('should return csvExport action', () => {
      const params = element._params();
      expect(params.action).to.equal('csvExport');
    });

    test('should include schemas when set', () => {
      element.schemas = 'dublincore, file';
      const params = element._params();
      const parsed = JSON.parse(params.parameters);
      expect(parsed.schemas).to.deep.equal(['dublincore', 'file']);
    });

    test('should include fields when set', () => {
      element.fields = 'dc:title, dc:creator';
      const params = element._params();
      const parsed = JSON.parse(params.parameters);
      expect(parsed.xpaths).to.deep.equal(['dc:title', 'dc:creator']);
    });

    test('should fall back to provider schemas', () => {
      element.schemas = null;
      element.provider = { schemas: 'common, uid' };
      const params = element._params();
      const parsed = JSON.parse(params.parameters);
      expect(parsed.schemas).to.deep.equal(['common', 'uid']);
    });

    test('should use the resolved schemas when schemas is not explicitly set', () => {
      element.provider = { schemas: 'dublincore' };
      element.schemas = null;
      element._resolvedSchemas = 'dublincore,note';
      const parsed = JSON.parse(element._params().parameters);
      expect(parsed.schemas).to.deep.equal(['dublincore', 'note']);
    });

    test('explicit schemas takes precedence over the resolved schemas', () => {
      element.provider = { schemas: 'dublincore' };
      element._resolvedSchemas = 'dublincore,note';
      element.schemas = 'dublincore, file';
      const parsed = JSON.parse(element._params().parameters);
      expect(parsed.schemas).to.deep.equal(['dublincore', 'file']);
    });
  });

  suite('_resolveSchemas', () => {
    const typesConfig = {
      doctypes: {
        Note: { schemas: ['dublincore', 'common', 'uid', 'note'] },
        File: { schemas: ['dublincore', 'common', 'uid', 'file'] },
      },
    };

    test('unions the provider display schemas with the schemas of the result document types', async () => {
      sinon.stub(element, '_fetchTypes').resolves(typesConfig);
      element.provider = {
        schemas: 'dublincore,common',
        currentPage: [{ type: 'Note' }, null, { type: 'File' }, { type: 'Note' }],
      };
      await element._resolveSchemas();
      const parsed = JSON.parse(element._params().parameters);
      expect(parsed.schemas.slice().sort()).to.deep.equal(['common', 'dublincore', 'file', 'note', 'uid']);
    });

    test('keeps the provider display schemas when there are no results', async () => {
      const fetchTypes = sinon.stub(element, '_fetchTypes').resolves(typesConfig);
      element.provider = { schemas: 'dublincore,common', currentPage: [] };
      await element._resolveSchemas();
      expect(fetchTypes).to.not.have.been.called;
      expect(element._resolvedSchemas.split(',').sort()).to.deep.equal(['common', 'dublincore']);
    });

    test('falls back to the provider display schemas when the types config cannot be fetched', async () => {
      sinon.stub(element, '_fetchTypes').rejects(new Error('boom'));
      element.provider = { schemas: 'dublincore,common', currentPage: [{ type: 'Note' }] };
      await element._resolveSchemas();
      expect(element._resolvedSchemas.split(',').sort()).to.deep.equal(['common', 'dublincore']);
    });

    test('keeps only the provider schemas when the result type is unknown to the types config', async () => {
      sinon.stub(element, '_fetchTypes').resolves({});
      element.provider = { schemas: 'dublincore', currentPage: [{ type: 'Unknown' }] };
      await element._resolveSchemas();
      expect(element._resolvedSchemas).to.equal('dublincore');
    });

    test('resolves to undefined when the provider has neither schemas nor results', async () => {
      element.provider = { currentPage: [] };
      await element._resolveSchemas();
      expect(element._resolvedSchemas).to.be.undefined;
    });

    test('resolves to undefined when there is no provider', async () => {
      element.provider = undefined;
      await element._resolveSchemas();
      expect(element._resolvedSchemas).to.be.undefined;
    });
  });

  suite('_providerChanged', () => {
    const makeProvider = () => {
      return {
        schemas: 'dublincore',
        addEventListener: sinon.spy(),
        removeEventListener: sinon.spy(),
      };
    };

    test('wires and rewires the current-page-changed listener when the provider changes', () => {
      const first = makeProvider();
      const second = makeProvider();
      element.provider = first;
      expect(first.addEventListener).to.have.been.calledWith('current-page-changed');
      element.provider = second;
      expect(first.removeEventListener).to.have.been.calledWith('current-page-changed');
      expect(second.addEventListener).to.have.been.calledWith('current-page-changed');
    });

    test('re-resolves the schemas when the provider fires current-page-changed', () => {
      const provider = makeProvider();
      element.provider = provider;
      const [, handler] = provider.addEventListener.firstCall.args;
      const resolveSpy = sinon.spy(element, '_resolveSchemas');
      handler();
      expect(resolveSpy).to.have.been.calledOnce;
    });

    test('tolerates a provider without event listener support and a later cleared provider', () => {
      element.provider = { schemas: 'dublincore' };
      element.provider = undefined;
      expect(element._resolvedSchemas).to.be.undefined;
    });

    test('removes the current-page-changed listener on detach', () => {
      const provider = makeProvider();
      element.provider = provider;
      provider.removeEventListener.resetHistory();
      element.detached();
      expect(provider.removeEventListener).to.have.been.calledWith('current-page-changed');
    });

    test('detach is a no-op when no provider listener was wired', () => {
      expect(() => element.detached()).to.not.throw();
    });

    test('detach is a no-op after the provider has been cleared', () => {
      const provider = makeProvider();
      element.provider = provider;
      element.provider = undefined;
      provider.removeEventListener.resetHistory();
      element.detached();
      expect(provider.removeEventListener).to.not.have.been.called;
    });

    test('detach tolerates a provider without removeEventListener', () => {
      element.provider = { schemas: 'dublincore' };
      expect(() => element.detached()).to.not.throw();
    });
  });

  suite('_fetchTypes', () => {
    test('delegates to the shared config/types helper via the local resource', async () => {
      element.$.types.get = sinon.stub().resolves({ doctypes: {} });
      const config = await element._fetchTypes();
      expect(config).to.be.an('object');
    });
  });
});
