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
import '../elements/nuxeo-admin/nuxeo-workflow-analytics.js';

suite('nuxeo-workflow-analytics', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-workflow-analytics></nuxeo-workflow-analytics>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default workflow to ParallelDocumentReview', () => {
      expect(element.workflow).to.equal('ParallelDocumentReview');
    });

    test('should default visible to false', () => {
      expect(element.visible).to.be.false;
    });

    test('should default index to nuxeo', () => {
      expect(element.index).to.equal('nuxeo');
    });
  });

  suite('_asDuration', () => {
    test('should format milliseconds to days hours minutes seconds', () => {
      // 1 day, 2 hours, 3 minutes, 4 seconds = 93784000 ms
      const ms = (1 * 24 * 60 * 60 + 2 * 60 * 60 + 3 * 60 + 4) * 1000;
      expect(element._asDuration(ms)).to.include('1 Days');
      expect(element._asDuration(ms)).to.include('2h');
      expect(element._asDuration(ms)).to.include('3m');
      expect(element._asDuration(ms)).to.include('4s');
    });

    test('should format hours only', () => {
      const ms = 2 * 60 * 60 * 1000;
      expect(element._asDuration(ms)).to.include('2h');
      expect(element._asDuration(ms)).to.not.include('Days');
    });

    test('should format minutes only', () => {
      const ms = 5 * 60 * 1000;
      expect(element._asDuration(ms)).to.include('5m');
    });

    test('should return empty string for 0', () => {
      expect(element._asDuration(0)).to.equal('');
    });
  });

  suite('_table', () => {
    test('should convert data entries to key-value with formatted duration', () => {
      const data = [
        { key: 'user1', value: 3600000 },
        { key: 'user2', value: 60000 },
      ];
      const result = element._table(data);
      expect(result).to.have.length(2);
      expect(result[0].key).to.equal('user1');
      expect(result[0].value).to.include('1h');
      expect(result[1].value).to.include('1m');
    });
  });

  suite('_labels', () => {
    test('should return empty array for null data', () => {
      expect(element._labels(null)).to.deep.equal([]);
    });

    test('should return labels from data with value array', () => {
      const data = { value: [{ key: 'task1' }, { key: 'task2' }] };
      const result = element._labels(data);
      expect(result).to.deep.equal(['task1', 'task2']);
    });
  });

  suite('_values', () => {
    test('should extract values from data entries', () => {
      const data = [{ value: [{ value: 10 }, { value: 20 }] }, { value: [{ value: 30 }, { value: 40 }] }];
      const result = element._values(data);
      expect(result).to.deep.equal([
        [10, 20],
        [30, 40],
      ]);
    });

    test('should handle non-array values', () => {
      const data = [{ value: 100 }, { value: 200 }];
      const result = element._values(data);
      expect(result).to.deep.equal([100, 200]);
    });
  });
});
