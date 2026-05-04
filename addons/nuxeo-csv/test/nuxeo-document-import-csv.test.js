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
import '../elements/nuxeo-document-import-csv.js';

suite('nuxeo-document-import-csv', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-import-csv></nuxeo-document-import-csv>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default accept to .csv', () => {
      expect(element.accept).to.equal('.csv');
    });

    test('should default hasFile to false', () => {
      expect(element.hasFile).to.be.false;
    });

    test('should default stage to upload', () => {
      expect(element.stage).to.equal('upload');
    });

    test('should default _creating to false', () => {
      expect(element._creating).to.be.false;
    });

    test('should default _error to false', () => {
      expect(element._error).to.be.false;
    });

    test('should default receiveEmailReport to false', () => {
      expect(element.receiveEmailReport).to.be.false;
    });
  });

  suite('_canImport', () => {
    test('should return true when hasFile and not creating', () => {
      element.hasFile = true;
      element._creating = false;
      expect(element._canImport()).to.be.true;
    });

    test('should return false when no file', () => {
      element.hasFile = false;
      expect(element._canImport()).to.be.false;
    });

    test('should return false when creating', () => {
      element.hasFile = true;
      element._creating = true;
      expect(element._canImport()).to.be.false;
    });
  });

  suite('_filterLogs', () => {
    test('should filter to only ERROR and SKIPPED logs', () => {
      const logs = [
        { status: 'ERROR', message: 'err' },
        { status: 'SUCCESS', message: 'ok' },
        { status: 'SKIPPED', message: 'skip' },
      ];
      const result = element._filterLogs(logs);
      expect(result).to.have.length(2);
    });

    test('should return empty array for all success logs', () => {
      const logs = [{ status: 'SUCCESS' }];
      expect(element._filterLogs(logs)).to.have.length(0);
    });
  });

  suite('_isError', () => {
    test('should return true for ERROR status', () => {
      expect(element._isError({ status: 'ERROR' })).to.be.true;
    });

    test('should return false for non-ERROR status', () => {
      expect(element._isError({ status: 'SUCCESS' })).to.be.false;
    });
  });

  suite('_isSkipped', () => {
    test('should return true for SKIPPED status', () => {
      expect(element._isSkipped({ status: 'SKIPPED' })).to.be.true;
    });

    test('should return false for non-SKIPPED status', () => {
      expect(element._isSkipped({ status: 'SUCCESS' })).to.be.false;
    });
  });

  suite('_computeImportDocTypes', () => {
    test('should filter out blacklisted types', () => {
      window.nuxeo = window.nuxeo || {};
      window.nuxeo.importBlacklist = ['Blacklisted'];
      element.subtypes = [
        { type: 'File', facets: [] },
        { type: 'Blacklisted', facets: [] },
      ];
      const result = element._computeImportDocTypes();
      expect(result).to.have.length(1);
      expect(result[0].type).to.equal('File');
    });
  });
});
