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
import moment from '@nuxeo/moment';

/**
 * @polymerBehavior Nuxeo.ChartDataBehavior
 */
export const ChartDataBehavior = {
  _labels(data) {
    return data.map(function(entry) {
      if (Array.isArray(entry.value)) {
        return entry.value.map(this._labels.bind(this));
      }
      return entry.key;
    });
  },
  _series(data) {
    return data.map((obj) => obj.key);
  },
  _values(data) {
    return [
      data.map(function(entry) {
        if (Array.isArray(entry.value)) {
          return entry.value.map(this._values.bind(this));
        }
        return entry.value;
      }),
    ];
  },
  _extendEndDate(date) {
    if (date && moment) {
      return this._formatDate(
        moment(date)
          .add(1, 'days')
          .subtract(1, 'ms')
          .toJSON(),
      );
    }
    return date;
  },

  _formatDate(date) {
    return moment(date).format('YYYY-MM-DD');
  },
};
