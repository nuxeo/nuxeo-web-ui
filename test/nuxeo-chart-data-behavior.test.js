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
import { ChartDataBehavior } from '../elements/nuxeo-admin/nuxeo-chart-data-behavior.js';

suite('ChartDataBehavior', () => {
  let behavior;

  setup(() => {
    behavior = Object.create(ChartDataBehavior);
  });

  suite('_labels', () => {
    test('should extract keys from flat data', () => {
      const data = [
        { key: 'Label A', value: 10 },
        { key: 'Label B', value: 20 },
      ];
      expect(behavior._labels(data)).to.deep.equal(['Label A', 'Label B']);
    });

    test('should currently throw for nested labels payload', () => {
      const data = [{ key: 'Parent', value: [{ key: 'Child A', value: 5 }] }];
      expect(() => behavior._labels(data)).to.throw();
    });
  });

  suite('_series', () => {
    test('should extract keys as series', () => {
      const data = [
        { key: 'Series A', value: 10 },
        { key: 'Series B', value: 20 },
      ];
      expect(behavior._series(data)).to.deep.equal(['Series A', 'Series B']);
    });
  });

  suite('_values', () => {
    test('should extract values from flat data', () => {
      const data = [
        { key: 'A', value: 10 },
        { key: 'B', value: 20 },
      ];
      expect(behavior._values(data)).to.deep.equal([[10, 20]]);
    });

    test('should currently throw for nested values payload', () => {
      const data = [{ key: 'Parent', value: [{ key: 'Child A', value: 5 }] }];
      expect(() => behavior._values(data)).to.throw();
    });
  });

  suite('_formatDate', () => {
    test('should format date to YYYY-MM-DD', () => {
      expect(behavior._formatDate('2024-03-15T10:30:00Z')).to.equal('2024-03-15');
    });
  });

  suite('_extendEndDate', () => {
    test('should extend date close to end of day', () => {
      const result = behavior._extendEndDate('2024-03-15T00:00:00Z');
      expect(result).to.match(/^2024-03-1[56]$/);
    });

    test('should return the date unchanged when null', () => {
      expect(behavior._extendEndDate(null)).to.be.null;
    });
  });
});
