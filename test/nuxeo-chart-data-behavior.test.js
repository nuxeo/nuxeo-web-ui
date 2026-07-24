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
  let originalVisualViewportDescriptor;
  let originalResizeObserver;
  let addEventListenerStub;
  let removeEventListenerStub;
  let visualViewportAddListenerStub;
  let visualViewportRemoveListenerStub;
  let visualViewportStubs;

  setup(() => {
    behavior = Object.create(ChartDataBehavior);
    originalVisualViewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    originalResizeObserver = window.ResizeObserver;
  });

  teardown(() => {
    if (addEventListenerStub) {
      addEventListenerStub.restore();
      addEventListenerStub = null;
    }
    if (removeEventListenerStub) {
      removeEventListenerStub.restore();
      removeEventListenerStub = null;
    }
    if (visualViewportStubs) {
      visualViewportStubs.add.restore();
      visualViewportStubs.remove.restore();
      visualViewportStubs = null;
    }
    if (originalVisualViewportDescriptor) {
      Object.defineProperty(window, 'visualViewport', originalVisualViewportDescriptor);
    } else {
      delete window.visualViewport;
    }
    if (originalResizeObserver !== undefined) {
      window.ResizeObserver = originalResizeObserver;
    } else {
      delete window.ResizeObserver;
    }
  });

  suite('resize handling', () => {
    test('attaches and detaches viewport listeners', () => {
      behavior._resizeCharts = sinon.spy();
      addEventListenerStub = sinon.stub(window, 'addEventListener');
      removeEventListenerStub = sinon.stub(window, 'removeEventListener');

      if (
        window.visualViewport &&
        typeof window.visualViewport.addEventListener === 'function' &&
        typeof window.visualViewport.removeEventListener === 'function'
      ) {
        visualViewportStubs = {
          add: sinon.stub(window.visualViewport, 'addEventListener'),
          remove: sinon.stub(window.visualViewport, 'removeEventListener'),
        };
        visualViewportAddListenerStub = visualViewportStubs.add;
        visualViewportRemoveListenerStub = visualViewportStubs.remove;
      } else {
        Object.defineProperty(window, 'visualViewport', {
          configurable: true,
          writable: true,
          value: {
            addEventListener: sinon.stub(),
            removeEventListener: sinon.stub(),
          },
        });
        visualViewportAddListenerStub = window.visualViewport.addEventListener;
        visualViewportRemoveListenerStub = window.visualViewport.removeEventListener;
      }

      behavior.attached();
      const boundWindowResizeHandler = behavior._boundWindowResizeHandler;
      const boundVisualViewportResizeHandler = behavior._boundVisualViewportResizeHandler;
      const boundVisualViewportScrollHandler = behavior._boundVisualViewportScrollHandler;

      expect(addEventListenerStub).to.have.been.calledWithExactly('resize', boundWindowResizeHandler);
      expect(visualViewportAddListenerStub).to.have.been.calledWithExactly('resize', boundVisualViewportResizeHandler);
      expect(visualViewportAddListenerStub).to.have.been.calledWithExactly('scroll', boundVisualViewportScrollHandler);
      expect(behavior._resizeCharts).to.have.been.called;

      behavior.detached();

      expect(removeEventListenerStub).to.have.been.calledWithExactly('resize', boundWindowResizeHandler);
      expect(visualViewportRemoveListenerStub).to.have.been.calledWithExactly(
        'resize',
        boundVisualViewportResizeHandler,
      );
      expect(visualViewportRemoveListenerStub).to.have.been.calledWithExactly(
        'scroll',
        boundVisualViewportScrollHandler,
      );
      expect(behavior._boundResizeCharts).to.be.null;
    });

    test('polls devicePixelRatio when viewport and ResizeObserver are unavailable', () => {
      const originalViewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');
      const originalViewport = window.visualViewport;
      const originalDpr = window.devicePixelRatio;
      const setIntervalStub = sinon.stub(window, 'setInterval').callsFake((callback) => {
        behavior._lastDevicePixelRatio = originalDpr - 1;
        callback();
        callback();
        return 1;
      });
      const clearIntervalStub = sinon.stub(window, 'clearInterval');

      behavior._resizeCharts = sinon.spy();
      behavior.async = (fn) => fn();

      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      window.ResizeObserver = undefined;

      behavior.attached();

      expect(setIntervalStub).to.have.been.calledOnce;
      expect(behavior._zoomCheckInterval).to.equal(1);
      expect(behavior._resizeCharts).to.have.been.calledTwice;

      behavior.detached();

      expect(clearIntervalStub).to.have.been.calledOnceWithExactly(1);
      expect(behavior._zoomCheckInterval).to.be.null;

      setIntervalStub.restore();
      clearIntervalStub.restore();
      Object.defineProperty(
        window,
        'visualViewport',
        originalViewportDescriptor || {
          configurable: true,
          writable: true,
          value: originalViewport,
        },
      );
      window.ResizeObserver = originalResizeObserver;
    });

    test('uses the fallback async wrapper when this.async is missing', () => {
      const originalSetTimeout = window.setTimeout;
      const setTimeoutStub = sinon.stub(window, 'setTimeout').callsFake((callback) => {
        callback();
        return 1;
      });

      behavior.root = null;
      behavior.shadowRoot = { querySelectorAll: sinon.stub().returns([]) };

      behavior._resizeCharts();

      expect(setTimeoutStub).to.have.been.calledOnceWithExactly(sinon.match.func, 1);

      setTimeoutStub.restore();
      window.setTimeout = originalSetTimeout;
    });

    test('falls back to the element when root and shadowRoot are absent', () => {
      behavior.querySelectorAll = sinon.stub().returns([]);
      behavior.root = null;
      behavior.shadowRoot = null;
      behavior.async = (fn) => fn();

      behavior._resizeCharts();

      expect(behavior.querySelectorAll).to.have.been.calledOnceWithExactly(
        'chart-bar, chart-line, chart-pie, nuxeo-document-distribution-chart',
      );
    });

    test('detached is safe before attached', () => {
      expect(() => behavior.detached()).to.not.throw();
    });

    test('registers and disconnects ResizeObserver when available on elements', () => {
      const observeSpy = sinon.spy();
      const disconnectSpy = sinon.spy();

      window.ResizeObserver = function ResizeObserverMock(callback) {
        this.callback = callback;
        this.observe = observeSpy;
        this.disconnect = disconnectSpy;
      };

      behavior = document.createElement('div');
      Object.assign(behavior, ChartDataBehavior);
      behavior._resizeCharts = sinon.spy();

      behavior.attached();

      expect(behavior._chartResizeObserver).to.exist;
      expect(observeSpy).to.have.been.calledOnceWithExactly(behavior);

      behavior.detached();

      expect(disconnectSpy).to.have.been.calledOnce;
      expect(behavior._chartResizeObserver).to.be.null;
    });

    test('returns early when no querySelectorAll is available', () => {
      behavior.root = {};
      behavior.async = (fn) => fn();

      expect(() => behavior._resizeCharts()).to.not.throw();
    });

    test('resizes chart elements exposing resize()', () => {
      const chartWithResize = { resize: sinon.spy(), offsetWidth: 100, offsetHeight: 50 };
      const chartWithoutResize = {};
      const hiddenChart = { resize: sinon.spy(), offsetWidth: 0, offsetHeight: 0 };
      behavior.root = {
        querySelectorAll: sinon.stub().returns([chartWithResize, chartWithoutResize, hiddenChart]),
      };
      behavior.async = (fn) => fn();

      behavior._resizeCharts();

      expect(behavior.root.querySelectorAll).to.have.been.calledOnceWithExactly(
        'chart-bar, chart-line, chart-pie, nuxeo-document-distribution-chart',
      );
      expect(chartWithResize.resize).to.have.been.calledOnce;
      expect(hiddenChart.resize).to.not.have.been.called;
    });

    test('named event handlers invoke _resizeCharts with the correct trigger', () => {
      behavior._resizeCharts = sinon.spy();
      addEventListenerStub = sinon.stub(window, 'addEventListener');

      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        writable: true,
        value: {
          addEventListener: sinon.stub(),
          removeEventListener: sinon.stub(),
        },
      });

      behavior.attached();

      behavior._boundWindowResizeHandler();
      behavior._boundVisualViewportResizeHandler();
      behavior._boundVisualViewportScrollHandler();

      const triggers = behavior._resizeCharts.args.map((a) => a[0]);
      expect(triggers).to.include('window.resize');
      expect(triggers).to.include('visualViewport.resize');
      expect(triggers).to.include('visualViewport.scroll');

      behavior.detached();
    });

    test('requestAnimationFrame callback skips falsy chart entries', () => {
      const originalRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb) => {
        cb(performance.now());
        return 1;
      };

      behavior.root = {
        querySelectorAll: sinon.stub().returns([null]),
      };
      behavior.async = (fn) => fn();

      expect(() => behavior._resizeCharts()).to.not.throw();

      window.requestAnimationFrame = originalRaf;
    });
  });

  suite('_logChartResizeDebug', () => {
    let consoleDebugStub;

    setup(() => {
      consoleDebugStub = sinon.stub(console, 'debug');
    });

    teardown(() => {
      consoleDebugStub.restore();
    });

    test('logs message with details when debug is enabled', () => {
      behavior._chartDebugEnabled = true;
      behavior._logChartResizeDebug('test.event', { key: 'value' });
      expect(consoleDebugStub).to.have.been.calledOnce;
      expect(consoleDebugStub.firstCall.args[0]).to.match(/\[nuxeo-chart-debug\].*test\.event/);
      expect(consoleDebugStub.firstCall.args[1]).to.deep.equal({ key: 'value' });
    });

    test('logs message without details when debug is enabled', () => {
      behavior._chartDebugEnabled = true;
      behavior._logChartResizeDebug('test.event');
      expect(consoleDebugStub).to.have.been.calledOnce;
      expect(consoleDebugStub.firstCall.args[0]).to.match(/\[nuxeo-chart-debug\].*test\.event/);
      expect(consoleDebugStub.firstCall.args).to.have.lengthOf(1);
    });
  });

  suite('_collectChartResizeSnapshot', () => {
    test('resolves canvas via chart.$.canvas', () => {
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 100;
      mockCanvas.height = 50;
      const chart = { $: { canvas: mockCanvas } };
      const snapshot = behavior._collectChartResizeSnapshot(chart);
      expect(snapshot.canvas.width).to.equal(100);
      expect(snapshot.canvas.height).to.equal(50);
    });

    test('resolves canvas via chart.shadowRoot querySelector', () => {
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 80;
      mockCanvas.height = 40;
      const chart = {
        shadowRoot: { querySelector: sinon.stub().returns(mockCanvas) },
      };
      const snapshot = behavior._collectChartResizeSnapshot(chart);
      expect(snapshot.canvas.width).to.equal(80);
    });

    test('collects full snapshot from a real DOM element with parent, canvas, and chartInstance', () => {
      const container = document.createElement('div');
      container.style.cssText = 'width:200px;height:100px;';
      document.body.appendChild(container);

      const chartEl = document.createElement('div');
      chartEl.style.cssText = 'width:150px;height:80px;';
      chartEl.chart = { width: 150, height: 80 };
      container.appendChild(chartEl);

      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 80;
      canvas.style.width = '150px';
      canvas.style.height = '80px';
      chartEl.appendChild(canvas);

      const snapshot = behavior._collectChartResizeSnapshot(chartEl);

      // computed styles (chart instanceof Element)
      expect(snapshot.styles.display).to.be.a('string');
      expect(snapshot.styles.width).to.be.a('string');

      // chartInstance via chart.chart
      expect(snapshot.chartInstance.width).to.equal(150);
      expect(snapshot.chartInstance.height).to.equal(80);

      // canvas via chart.querySelector('canvas')
      expect(snapshot.canvas.width).to.equal(150);
      expect(snapshot.canvas.height).to.equal(80);
      expect(snapshot.canvas.cssWidth).to.equal('150px');
      expect(snapshot.canvas.cssHeight).to.equal('80px');

      // parent from parentElement
      expect(snapshot.parent.offsetWidth).to.be.a('number');
      expect(snapshot.parent.clientWidth).to.be.a('number');

      // chartRect from getBoundingClientRect
      expect(snapshot.chart.rectWidth).to.be.a('number');
      expect(snapshot.chart.rectHeight).to.be.a('number');

      document.body.removeChild(container);
    });
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
