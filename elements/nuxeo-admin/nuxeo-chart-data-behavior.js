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
    this._chartDebugEnabled = Boolean(window.NX_CHART_DEBUG);
    this._boundResizeCharts = this._resizeCharts.bind(this);
    this._lastDevicePixelRatio = window.devicePixelRatio;
    this._boundWindowResizeHandler = () => {
      this._logChartResizeDebug('window.resize');
      this._boundResizeCharts('window.resize');
    };
    window.addEventListener('resize', this._boundWindowResizeHandler);
    if (window.visualViewport) {
      this._visualViewport = window.visualViewport;
      this._boundVisualViewportResizeHandler = () => {
        this._logChartResizeDebug('visualViewport.resize');
        this._boundResizeCharts('visualViewport.resize');
      };
      this._boundVisualViewportScrollHandler = () => {
        this._logChartResizeDebug('visualViewport.scroll');
        this._boundResizeCharts('visualViewport.scroll');
      };
      this._visualViewport.addEventListener('resize', this._boundVisualViewportResizeHandler);
      this._visualViewport.addEventListener('scroll', this._boundVisualViewportScrollHandler);
    }
    if (typeof ResizeObserver !== 'undefined' && this instanceof Element) {
      this._chartResizeObserver = new ResizeObserver((entries) => {
        if (this._chartDebugEnabled) {
          this._logChartResizeDebug('ResizeObserver.callback', {
            entries: entries.map((entry) => {
              return {
                target: entry.target != null ? entry.target.tagName : undefined,
                width: entry.contentRect != null ? entry.contentRect.width : undefined,
                height: entry.contentRect != null ? entry.contentRect.height : undefined,
              };
            }),
          });
        }
        this._boundResizeCharts('ResizeObserver.callback');
      });
      this._chartResizeObserver.observe(this);
    }
    if (!window.visualViewport) {
      this._zoomCheckInterval = setInterval(() => {
        if (window.devicePixelRatio !== this._lastDevicePixelRatio) {
          const previousDevicePixelRatio = this._lastDevicePixelRatio;
          this._lastDevicePixelRatio = window.devicePixelRatio;
          this._logChartResizeDebug('devicePixelRatio.changed', {
            previousDevicePixelRatio,
            currentDevicePixelRatio: this._lastDevicePixelRatio,
          });
          this._resizeCharts('devicePixelRatio.changed');
        }
      }, 250);
    }
    this._resizeCharts('attached');
  },

  detached() {
    if (this._boundResizeCharts) {
      window.removeEventListener('resize', this._boundWindowResizeHandler);
      if (this._visualViewport) {
        this._visualViewport.removeEventListener('resize', this._boundVisualViewportResizeHandler);
        this._visualViewport.removeEventListener('scroll', this._boundVisualViewportScrollHandler);
        this._visualViewport = null;
      }
      this._boundWindowResizeHandler = null;
      this._boundVisualViewportResizeHandler = null;
      this._boundVisualViewportScrollHandler = null;
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
    this._chartDebugEnabled = null;
  },

  _resizeCharts(trigger = 'manual') {
    const async = typeof this.async === 'function' ? this.async.bind(this) : (fn, waitTime) => setTimeout(fn, waitTime);
    async(() => {
      const root = this.root || this.shadowRoot || this;
      this._logChartResizeDebug('resizeCharts.schedule', { trigger, rootTag: root != null ? root.tagName : undefined });
      if (!root || typeof root.querySelectorAll !== 'function') {
        return;
      }
      const charts = Array.from(
        root.querySelectorAll('chart-bar, chart-line, chart-pie, nuxeo-document-distribution-chart'),
      );
      this._logChartResizeDebug('resizeCharts.chartsFound', { trigger, chartCount: charts.length });
      charts.forEach((chart, chartIndex) => {
        if (!chart || typeof chart.resize !== 'function') {
          this._logChartResizeDebug('resizeCharts.chartSkipped', {
            trigger,
            chartIndex,
            reason: 'missing-resize-method',
            tagName: chart != null ? chart.tagName : undefined,
          });
          return;
        }
        if (chart.offsetWidth <= 0) {
          this._logChartResizeDebug('resizeCharts.chartSkipped', {
            trigger,
            chartIndex,
            reason: 'non-positive-width',
            tagName: chart.tagName,
            offsetWidth: chart.offsetWidth,
            offsetHeight: chart.offsetHeight,
          });
          return;
        }
        if (this._chartDebugEnabled) {
          this._logChartResizeDebug('chart.resize.before', {
            trigger,
            chartIndex,
            chartTag: chart.tagName,
            snapshot: this._collectChartResizeSnapshot(chart),
          });
        }
        chart.resize();
        if (this._chartDebugEnabled) {
          this._logChartResizeDebug('chart.resize.afterSync', {
            trigger,
            chartIndex,
            chartTag: chart.tagName,
            snapshot: this._collectChartResizeSnapshot(chart),
          });
        }
      });
      if (this._chartDebugEnabled) {
        requestAnimationFrame(() => {
          charts.forEach((chart) => {
            if (chart) {
              this._logChartResizeDebug('chart.resize.afterRaf', {
                trigger,
                chartTag: chart.tagName,
                snapshot: this._collectChartResizeSnapshot(chart),
              });
            }
          });
        });
      }
    }, 1);
  },

  _collectChartResizeSnapshot(chart) {
    const parent = chart != null ? chart.parentElement : undefined;
    const canvas =
      (chart && chart.$ && chart.$.canvas) ||
      (chart && chart.shadowRoot && chart.shadowRoot.querySelector('#canvas')) ||
      (chart != null && chart.querySelector != null ? chart.querySelector('canvas') : undefined);
    const rectOf = (el) => {
      const rect = el != null && el.getBoundingClientRect != null ? el.getBoundingClientRect() : undefined;
      return rect != null ? rect : null;
    };
    const chartRect = rectOf(chart);
    const parentRect = rectOf(parent);
    const computed = chart instanceof Element ? window.getComputedStyle(chart) : null;
    return {
      viewport: {
        devicePixelRatio: window.devicePixelRatio,
        innerWidth: window.innerWidth,
        outerWidth: window.outerWidth,
        visualViewportWidth: window.visualViewport != null ? window.visualViewport.width : undefined,
        visualViewportScale: window.visualViewport != null ? window.visualViewport.scale : undefined,
      },
      chart: {
        offsetWidth: chart != null ? chart.offsetWidth : undefined,
        offsetHeight: chart != null ? chart.offsetHeight : undefined,
        clientWidth: chart != null ? chart.clientWidth : undefined,
        clientHeight: chart != null ? chart.clientHeight : undefined,
        rectWidth: chartRect != null ? chartRect.width : undefined,
        rectHeight: chartRect != null ? chartRect.height : undefined,
      },
      parent: {
        offsetWidth: parent != null ? parent.offsetWidth : undefined,
        offsetHeight: parent != null ? parent.offsetHeight : undefined,
        clientWidth: parent != null ? parent.clientWidth : undefined,
        clientHeight: parent != null ? parent.clientHeight : undefined,
        rectWidth: parentRect != null ? parentRect.width : undefined,
        rectHeight: parentRect != null ? parentRect.height : undefined,
      },
      styles: {
        display: computed != null ? computed.display : undefined,
        width: computed != null ? computed.width : undefined,
        minWidth: computed != null ? computed.minWidth : undefined,
        maxWidth: computed != null ? computed.maxWidth : undefined,
        flex: computed != null ? computed.flex : undefined,
        overflow: computed != null ? computed.overflow : undefined,
        transform: computed != null ? computed.transform : undefined,
      },
      chartInstance: {
        width: chart != null && chart.chart != null ? chart.chart.width : undefined,
        height: chart != null && chart.chart != null ? chart.chart.height : undefined,
      },
      canvas: {
        cssWidth: canvas != null && canvas.style != null ? canvas.style.width : undefined,
        cssHeight: canvas != null && canvas.style != null ? canvas.style.height : undefined,
        width: canvas != null ? canvas.width : undefined,
        height: canvas != null ? canvas.height : undefined,
        clientWidth: canvas != null ? canvas.clientWidth : undefined,
        clientHeight: canvas != null ? canvas.clientHeight : undefined,
      },
    };
  },

  _logChartResizeDebug(message, details) {
    if (!this._chartDebugEnabled) {
      return;
    }
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.debug(`[nuxeo-chart-debug][${timestamp}] ${message}`, ...(details === undefined ? [] : [details]));
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
  _chartAria(headingKey, data, headingArg) {
    const heading = this.i18n(headingKey, headingArg);
    if (!data || data.length === 0) {
      return heading;
    }
    const points = data
      .map((entry) => {
        const value = Array.isArray(entry.value)
          ? entry.value.map((item) => `${item.key}: ${item.value}`).join(', ')
          : entry.value;
        return `${entry.key}: ${value}`;
      })
      .join(', ');
    return `${heading}. ${points}`;
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
