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
        this._logChartResizeDebug('ResizeObserver.callback', {
          entries: entries.map((entry) => {
            return {
              target: entry.target?.tagName,
              width: entry.contentRect?.width,
              height: entry.contentRect?.height,
            };
          }),
        });
        this._boundResizeCharts('ResizeObserver.callback');
      });
      this._chartResizeObserver.observe(this);
    }
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
      this._logChartResizeDebug('resizeCharts.schedule', {
        trigger,
        rootTag: root?.tagName,
      });
      if (!root || typeof root.querySelectorAll !== 'function') {
        return;
      }
      const charts = Array.from(
        root.querySelectorAll('chart-bar, chart-line, chart-pie, nuxeo-document-distribution-chart'),
      );
      this._logChartResizeDebug('resizeCharts.chartsFound', {
        trigger,
        chartCount: charts.length,
      });
      charts.forEach((chart, chartIndex) => {
        if (!chart || typeof chart.resize !== 'function') {
          this._logChartResizeDebug('resizeCharts.chartSkipped', {
            trigger,
            chartIndex,
            reason: 'missing-resize-method',
            tagName: chart?.tagName,
          });
          return;
        }
        if (chart.offsetWidth <= 0 || chart.offsetHeight <= 0) {
          this._logChartResizeDebug('resizeCharts.chartSkipped', {
            trigger,
            chartIndex,
            reason: 'non-positive-dimensions',
            tagName: chart.tagName,
            offsetWidth: chart.offsetWidth,
            offsetHeight: chart.offsetHeight,
          });
          return;
        }
        const before = this._collectChartResizeSnapshot(chart);
        this._logChartResizeDebug('chart.resize.before', {
          trigger,
          chartIndex,
          chartTag: chart.tagName,
          snapshot: before,
        });
        chart.resize();
        const afterSync = this._collectChartResizeSnapshot(chart);
        this._logChartResizeDebug('chart.resize.afterSync', {
          trigger,
          chartIndex,
          chartTag: chart.tagName,
          snapshot: afterSync,
        });
      });

      requestAnimationFrame(() => {
        charts.forEach((chart, chartIndex) => {
          if (chart) {
            this._logChartResizeDebug('chart.resize.afterRaf', {
              trigger,
              chartIndex,
              chartTag: chart.tagName,
              snapshot: this._collectChartResizeSnapshot(chart),
            });
          }
        });
      });
    }, 1);
  },

  _collectChartResizeSnapshot(chart) {
    const parent = chart?.parentElement;
    const canvas = chart?.$?.canvas || chart?.shadowRoot?.querySelector('#canvas') || chart?.querySelector?.('canvas');
    const chartRect = chart?.getBoundingClientRect?.() ?? null;
    const parentRect = parent?.getBoundingClientRect?.() ?? null;
    const computed = chart instanceof Element ? window.getComputedStyle(chart) : null;

    return {
      viewport: {
        devicePixelRatio: window.devicePixelRatio,
        innerWidth: window.innerWidth,
        outerWidth: window.outerWidth,
        visualViewportWidth: window.visualViewport?.width,
        visualViewportScale: window.visualViewport?.scale,
      },
      chart: {
        offsetWidth: chart?.offsetWidth,
        offsetHeight: chart?.offsetHeight,
        clientWidth: chart?.clientWidth,
        clientHeight: chart?.clientHeight,
        rectWidth: chartRect?.width,
        rectHeight: chartRect?.height,
      },
      parent: {
        offsetWidth: parent?.offsetWidth,
        offsetHeight: parent?.offsetHeight,
        clientWidth: parent?.clientWidth,
        clientHeight: parent?.clientHeight,
        rectWidth: parentRect?.width,
        rectHeight: parentRect?.height,
      },
      styles: {
        display: computed?.display,
        width: computed?.width,
        minWidth: computed?.minWidth,
        maxWidth: computed?.maxWidth,
        flex: computed?.flex,
        overflow: computed?.overflow,
        transform: computed?.transform,
      },
      chartInstance: {
        width: chart?.chart?.width,
        height: chart?.chart?.height,
      },
      canvas: {
        cssWidth: canvas?.style?.width,
        cssHeight: canvas?.style?.height,
        width: canvas?.width,
        height: canvas?.height,
        clientWidth: canvas?.clientWidth,
        clientHeight: canvas?.clientHeight,
      },
    };
  },

  _logChartResizeDebug(message, details) {
    if (!this._chartDebugEnabled) {
      return;
    }
    const timestamp = new Date().toISOString();
    if (details !== undefined) {
      // eslint-disable-next-line no-console
      console.debug(`[nuxeo-chart-debug][${timestamp}] ${message}`, details);
      return;
    }
    // eslint-disable-next-line no-console
    console.debug(`[nuxeo-chart-debug][${timestamp}] ${message}`);
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
