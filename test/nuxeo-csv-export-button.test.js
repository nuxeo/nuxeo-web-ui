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
  });
});
