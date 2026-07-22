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
  attached() {
    this._boundResizeCharts = this._resizeCharts.bind(this);
    this._lastDevicePixelRatio = window.devicePixelRatio;
    window.addEventListener('resize', this._boundResizeCharts);
    if (window.visualViewport) {
      this._visualViewport = window.visualViewport;
      this._visualViewport.addEventListener('resize', this._boundResizeCharts);
      this._visualViewport.addEventListener('scroll', this._boundResizeCharts);
    }
    if (typeof ResizeObserver !== 'undefined' && this instanceof Element) {
      this._chartResizeObserver = new ResizeObserver(this._boundResizeCharts);
      this._chartResizeObserver.observe(this);
    }
    // Poll devicePixelRatio only as fallback when viewport/observer listeners are unavailable.
    if (!this._visualViewport && !this._chartResizeObserver) {
      this._zoomCheckInterval = setInterval(() => {
        if (window.devicePixelRatio !== this._lastDevicePixelRatio) {
          this._lastDevicePixelRatio = window.devicePixelRatio;
          this._resizeCharts();
        }
      }, 250);
    }
    this._resizeCharts();
  },

  detached() {
    if (this._boundResizeCharts) {
      window.removeEventListener('resize', this._boundResizeCharts);
      if (this._visualViewport) {
        this._visualViewport.removeEventListener('resize', this._boundResizeCharts);
        this._visualViewport.removeEventListener('scroll', this._boundResizeCharts);
        this._visualViewport = null;
      }
      this._boundResizeCharts = null;
    }
    if (this._zoomCheckInterval) {
      clearInterval(this._zoomCheckInterval);
      this._zoomCheckInterval = null;
    }
    if (this._chartResizeObserver) {
      this._chartResizeObserver.disconnect();
      this._chartResizeObserver = null;
    }
  },

  _resizeCharts() {
    const async = typeof this.async === 'function' ? this.async.bind(this) : (fn) => setTimeout(fn, 1);
    async(() => {
      const root = this.root || this.shadowRoot || this;
      if (!root || typeof root.querySelectorAll !== 'function') {
        return;
      }
      Array.from(root.querySelectorAll('chart-bar, chart-line, chart-pie, nuxeo-document-distribution-chart'))
        .filter(
          (chart) => chart && typeof chart.resize === 'function' && chart.offsetWidth > 0 && chart.offsetHeight > 0,
        )
        .forEach((chart) => chart.resize());
    }, 1);
  },

  _labels(data) {
    return data.map(function (entry) {
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
      data.map(function (entry) {
        if (Array.isArray(entry.value)) {
          return entry.value.map(this._values.bind(this));
        }
        return entry.value;
      }),
    ];
  },
  _extendEndDate(date) {
    if (date && moment) {
      return this._formatDate(moment(date).add(1, 'days').subtract(1, 'ms').toJSON());
    }
    return date;
  },

  _formatDate(date) {
    return moment(date).format('YYYY-MM-DD');
  },
};
