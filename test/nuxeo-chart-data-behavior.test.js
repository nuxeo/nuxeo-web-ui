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
  let addEventListenerStub;
  let removeEventListenerStub;
  let visualViewportAddListenerStub;
  let visualViewportRemoveListenerStub;
  let visualViewport;

  setup(() => {
    behavior = Object.create(ChartDataBehavior);
    addEventListenerStub = sinon.stub(window, 'addEventListener');
    removeEventListenerStub = sinon.stub(window, 'removeEventListener');
    visualViewport = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
    };
    visualViewportAddListenerStub = visualViewport.addEventListener;
    visualViewportRemoveListenerStub = visualViewport.removeEventListener;
    window.visualViewport = visualViewport;
  });

  teardown(() => {
    addEventListenerStub.restore();
    removeEventListenerStub.restore();
    delete window.visualViewport;
  });

  suite('resize handling', () => {
    test('registers and removes window resize listener', () => {
      behavior._resizeCharts = sinon.spy();

      behavior.attached();
      expect(addEventListenerStub).to.have.been.calledWithExactly('resize', behavior._boundResizeCharts);
      expect(visualViewportAddListenerStub).to.have.been.calledWithMatch('resize', behavior._boundResizeCharts);
      expect(behavior._resizeCharts).to.have.been.calledOnce;

      behavior.detached();
      expect(removeEventListenerStub).to.have.been.calledWithExactly('resize', sinon.match.func);
      expect(visualViewportRemoveListenerStub).to.have.been.calledWithMatch('resize', sinon.match.func);
      expect(behavior._boundResizeCharts).to.be.null;
    });

    test('registers visualViewport scroll listener for zoom events', () => {
      behavior._resizeCharts = sinon.spy();

      behavior.attached();
      // Check that scroll event is registered on visualViewport (for zoom changes)
      expect(visualViewportAddListenerStub.callCount).to.be.greaterThanOrEqual(2);
      const scrollCall = visualViewportAddListenerStub.getCalls().find((c) => c.args[0] === 'scroll');
      expect(scrollCall).to.exist;

      behavior.detached();
      expect(visualViewportRemoveListenerStub.callCount).to.be.greaterThanOrEqual(2);
    });

    test('monitors devicePixelRatio for browser zoom changes', () => {
      behavior._resizeCharts = sinon.spy();
      const originalRatio = window.devicePixelRatio;

      behavior.attached();
      expect(behavior._lastDevicePixelRatio).to.equal(originalRatio);
      expect(behavior._zoomCheckInterval).to.exist;

      behavior.detached();
      expect(behavior._zoomCheckInterval).to.be.null;
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
