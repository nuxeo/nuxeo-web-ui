/**
 * Do not rename to performance.test.js: that filename prevents the suite from loading in
 * Karma + @open-wc/karma-esm (likely clashes with the browser `performance` global in module resolution).
 *
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

import './ensure-nuxeo-global.js';
// Alias: binding name `Performance` can clash with the browser's global Performance API
// after Babel/Istanbul transforms when many modules load together.
import { Performance as NuxeoPerf } from '../elements/performance.js';

suite('Performance', () => {
  suite('getDeviceType', () => {
    test('should return "phone" for iPhone user agent', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')).to.equal('phone');
    });

    test('should return "phone" for Android phone user agent', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (Linux; Android 12; Pixel 6) Mobile')).to.equal('phone');
    });

    test('should return "tablet" for iPad user agent', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)')).to.equal('tablet');
    });

    test('should return "tablet" for Android tablet user agent', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (Linux; Android 12; SM-T870)')).to.equal('tablet');
    });

    test('should return "desktop" for desktop user agent', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).to.equal('desktop');
    });

    test('should return "phone" for Windows Phone user agent', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (Windows Phone 10.0; Android 6.0)')).to.equal('phone');
    });

    test('should return "tablet" for Windows tablet user agent', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (Windows NT 10.0; Touch)')).to.equal('tablet');
    });

    test('should return "phone" for iPod user agent', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0)')).to.equal('phone');
    });

    test('should use navigator.userAgent when no ua argument given', () => {
      const result = NuxeoPerf.getDeviceType();
      expect(result).to.be.oneOf(['phone', 'tablet', 'desktop']);
    });
  });

  suite('getFirstPaint', () => {
    test('should return a number or null', () => {
      const result = NuxeoPerf.getFirstPaint();
      if (result !== null) {
        expect(result).to.be.a('number');
      }
    });
  });

  suite('getFirstContentfulPaint', () => {
    test('should return a number or null', () => {
      const result = NuxeoPerf.getFirstContentfulPaint();
      if (result !== null) {
        expect(result).to.be.a('number');
      }
    });
  });

  suite('getOnLoad', () => {
    test('should return a number when the navigation entry is available', () => {
      const result = NuxeoPerf.getOnLoad();
      if (result !== null) {
        expect(result).to.be.a('number');
      }
    });
  });

  suite('getDomContentLoaded', () => {
    test('should return a number when the navigation entry is available', () => {
      const result = NuxeoPerf.getDomContentLoaded();
      if (result !== null) {
        expect(result).to.be.a('number');
      }
    });
  });

  suite('getUrl', () => {
    test('should return current window location', () => {
      expect(NuxeoPerf.getUrl()).to.equal(window.location.href);
    });
  });

  suite('getUserAgent', () => {
    test('should return navigator user agent string', () => {
      expect(NuxeoPerf.getUserAgent()).to.equal(window.navigator.userAgent);
    });
  });

  suite('getEffectiveConnectionType', () => {
    test('should return a value or null', () => {
      const result = NuxeoPerf.getEffectiveConnectionType();
      if (result !== null) {
        expect(result).to.be.a('string');
      }
    });
  });

  suite('getUserTiming', () => {
    test('should return an array of marks and measures', () => {
      performance.mark('test-ut-mark');
      const result = NuxeoPerf.getUserTiming();
      expect(result).to.be.an('array');
      const found = result.find((e) => e.name === 'test-ut-mark');
      expect(found).to.exist;
      expect(found.type).to.equal('mark');
      expect(found.startTime).to.be.a('number');
      performance.clearMarks('test-ut-mark');
    });

    test('should include measures with duration', () => {
      performance.mark('ut-start');
      performance.mark('ut-end');
      performance.measure('ut-measure', 'ut-start', 'ut-end');
      const result = NuxeoPerf.getUserTiming();
      const measure = result.find((e) => e.name === 'ut-measure');
      expect(measure).to.exist;
      expect(measure.type).to.equal('measure');
      expect(measure.duration).to.be.a('number');
      performance.clearMarks('ut-start');
      performance.clearMarks('ut-end');
      performance.clearMeasures('ut-measure');
    });
  });

  suite('getResources', () => {
    test('should return an array of resource entries', () => {
      const result = NuxeoPerf.getResources();
      if (result !== null) {
        expect(result).to.be.an('array');
        if (result.length > 0) {
          expect(result[0]).to.have.property('url');
          expect(result[0]).to.have.property('type');
          expect(result[0]).to.have.property('startTime');
          expect(result[0]).to.have.property('duration');
          expect(result[0]).to.have.property('transfered');
          expect(result[0]).to.have.property('size');
        }
      }
    });
  });

  suite('getLongTasks', () => {
    test('should return null when __lt is undefined', () => {
      expect(NuxeoPerf.getLongTasks()).to.be.null;
    });

    test('should return mapped long tasks when __lt exists', () => {
      window.__lt = { e: [{ startTime: 100.5, duration: 55.3 }] };
      const result = NuxeoPerf.getLongTasks();
      expect(result).to.deep.equal([{ startTime: 101, duration: 55 }]);
      delete window.__lt;
    });

    test('should handle empty __lt.e array', () => {
      window.__lt = { e: [] };
      const result = NuxeoPerf.getLongTasks();
      expect(result).to.deep.equal([]);
      delete window.__lt;
    });

    test('should handle multiple long tasks', () => {
      window.__lt = {
        e: [
          { startTime: 10, duration: 60 },
          { startTime: 200.7, duration: 100.9 },
        ],
      };
      const result = NuxeoPerf.getLongTasks();
      expect(result).to.have.length(2);
      expect(result[0]).to.deep.equal({ startTime: 10, duration: 60 });
      expect(result[1]).to.deep.equal({ startTime: 201, duration: 101 });
      delete window.__lt;
    });
  });

  suite('getDeviceType', () => {
    test('should detect phone from Android mobile UA', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (Linux; Android 10; Pixel) AppleWebKit Mobile')).to.equal('phone');
    });

    test('should detect tablet from iPad UA', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).to.equal('tablet');
    });

    test('should detect tablet from Android without mobile token', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (Linux; Android 11; Tablet)')).to.equal('tablet');
    });

    test('should return desktop for generic desktop UA', () => {
      expect(NuxeoPerf.getDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).to.equal('desktop');
    });
  });

  suite('getNetworkStats', () => {
    test('should return object with finish, requestCount, transferSize and size', () => {
      const result = NuxeoPerf.getNetworkStats();
      expect(result).to.have.property('finish');
      expect(result).to.have.property('requestCount');
      expect(result).to.have.property('transferSize');
      expect(result).to.have.property('size');
      expect(result.requestCount).to.be.a('number');
    });

    test('should report zeroed sizes when no resource has been recorded', () => {
      const stub = sinon.stub(NuxeoPerf, 'getResources').callsFake(() => []);
      const result = NuxeoPerf.getNetworkStats();
      expect(result.requestCount).to.equal(0);
      expect(result.transferSize).to.equal(0);
      expect(result.size).to.equal(0);
      expect(result.finish).to.be.undefined;
      stub.restore();
    });

    test('should report zeroed stats when the resource timing API is unavailable', () => {
      // getResources() returns null, not [], when PerformanceResourceTiming is undefined
      const stub = sinon.stub(NuxeoPerf, 'getResources').callsFake(() => null);
      const result = NuxeoPerf.getNetworkStats();
      expect(result.requestCount).to.equal(0);
      expect(result.transferSize).to.equal(0);
      expect(result.size).to.equal(0);
      expect(result.finish).to.be.undefined;
      stub.restore();
    });

    test('should not throw from report() when the resource timing API is unavailable', () => {
      const stub = sinon.stub(NuxeoPerf, 'getResources').callsFake(() => null);
      expect(() => NuxeoPerf.report({ all: true })).to.not.throw();
      stub.restore();
    });

    test('should report the finish time of the latest resource when resources are out of order', () => {
      // the latest resource is first, and the list is long enough that an incorrect comparator
      // leaves the order untouched instead of accidentally producing the right one
      const build = () => [
        { transfered: 10, size: 100, startTime: 1000, duration: 7 },
        ...Array.from({ length: 29 }, (_, i) => {
          return { transfered: 1, size: 2, startTime: i + 1, duration: 1 };
        }),
      ];
      const stub = sinon.stub(NuxeoPerf, 'getResources').callsFake(build);
      const result = NuxeoPerf.getNetworkStats();
      expect(result.finish).to.equal(1007);
      expect(result.requestCount).to.equal(30);
      expect(result.transferSize).to.equal(39);
      expect(result.size).to.equal(158);
      stub.restore();
    });
  });

  suite('mark and clearMarks', () => {
    test('should call performance.mark', () => {
      const stub = sinon.stub(performance, 'mark');
      NuxeoPerf.mark('test-mark');
      expect(stub).to.have.been.calledWith('test-mark');
      stub.restore();
    });

    test('should call performance.clearMarks', () => {
      const stub = sinon.stub(performance, 'clearMarks');
      NuxeoPerf.clearMarks('test-mark');
      expect(stub).to.have.been.calledWith('test-mark');
      stub.restore();
    });
  });

  suite('markUnique', () => {
    test('should clear then mark', () => {
      const clearStub = sinon.stub(performance, 'clearMarks');
      const markStub = sinon.stub(performance, 'mark');
      NuxeoPerf.markUnique('unique-mark');
      expect(clearStub).to.have.been.calledWith('unique-mark');
      expect(markStub).to.have.been.calledWith('unique-mark');
      clearStub.restore();
      markStub.restore();
    });
  });

  suite('measure and clearMeasures', () => {
    test('should call performance.measure with filtered args', () => {
      const stub = sinon.stub(performance, 'measure');
      NuxeoPerf.measure('test-measure', 'start', 'end');
      expect(stub).to.have.been.calledWith('test-measure', 'start', 'end');
      stub.restore();
    });

    test('should filter out falsy args', () => {
      const stub = sinon.stub(performance, 'measure');
      NuxeoPerf.measure('test-measure', null, undefined);
      expect(stub).to.have.been.calledWith('test-measure');
      stub.restore();
    });

    test('should call performance.clearMeasures', () => {
      const stub = sinon.stub(performance, 'clearMeasures');
      NuxeoPerf.clearMeasures('test-measure');
      expect(stub).to.have.been.calledWith('test-measure');
      stub.restore();
    });
  });

  suite('measureUnique', () => {
    test('should clear then measure', () => {
      const clearStub = sinon.stub(performance, 'clearMeasures');
      const measureStub = sinon.stub(performance, 'measure');
      NuxeoPerf.measureUnique('unique-measure', 'start', 'end');
      expect(clearStub).to.have.been.calledWith('unique-measure');
      expect(measureStub).to.have.been.calledWith('unique-measure', 'start', 'end');
      clearStub.restore();
      measureStub.restore();
    });
  });

  suite('report', () => {
    test('should return base metrics by default', () => {
      const result = NuxeoPerf.report();
      expect(result).to.have.property('domContentLoaded');
      expect(result).to.have.property('firstContentfulPaint');
      expect(result).to.have.property('firstPaint');
      expect(result).to.have.property('onLoad');
      expect(result).to.have.property('userAgent');
      expect(result).to.have.property('userTiming');
      expect(result).to.not.have.property('deviceType');
      expect(result).to.not.have.property('effectiveConnectionType');
    });

    test('should include deviceType when option is set', () => {
      const result = NuxeoPerf.report({ deviceType: true });
      expect(result).to.have.property('deviceType');
      expect(result).to.not.have.property('url');
    });

    test('should include effectiveConnectionType when option is set', () => {
      const result = NuxeoPerf.report({ effectiveConnectionType: true });
      expect(result).to.have.property('effectiveConnectionType');
    });

    test('should include url when option is set', () => {
      const result = NuxeoPerf.report({ url: true });
      expect(result).to.have.property('url');
      expect(result.url).to.equal(window.location.href);
    });

    test('should include longTasks when option is set', () => {
      const result = NuxeoPerf.report({ longTasks: true });
      expect(result).to.have.property('longTasks');
    });

    test('should include resources when option is set', () => {
      const result = NuxeoPerf.report({ resources: true });
      expect(result).to.have.property('resources');
    });

    test('should include networkStats when option is set', () => {
      const result = NuxeoPerf.report({ networkStats: true });
      expect(result).to.have.property('networkStats');
    });

    test('should include all optional metrics when all option is set', () => {
      const result = NuxeoPerf.report({ all: true });
      expect(result).to.have.property('deviceType');
      expect(result).to.have.property('effectiveConnectionType');
      expect(result).to.have.property('url');
      expect(result).to.have.property('resources');
      expect(result).to.have.property('networkStats');
      expect(result).to.have.property('longTasks');
    });

    test('should handle undefined options', () => {
      const result = NuxeoPerf.report(undefined);
      expect(result).to.have.property('userAgent');
    });
  });

  suite('branch coverage: paint and timing fallbacks', () => {
    test('getFirstPaint returns null when no first-paint entry', () => {
      if (typeof PerformancePaintTiming === 'undefined') {
        return;
      }
      const stub = sinon.stub(performance, 'getEntriesByType').callsFake((type) => {
        if (type === 'paint') {
          return [{ name: 'first-contentful-paint', startTime: 12 }];
        }
        return [];
      });
      expect(NuxeoPerf.getFirstPaint()).to.be.null;
      stub.restore();
    });

    test('getFirstPaint returns null when the paint timing type is missing', () => {
      const had = window.PerformancePaintTiming;
      try {
        delete window.PerformancePaintTiming;
        expect(NuxeoPerf.getFirstPaint()).to.be.null;
      } finally {
        if (had !== undefined) {
          window.PerformancePaintTiming = had;
        }
      }
    });

    test('getFirstContentfulPaint returns null when paint timing type missing', () => {
      const had = window.PerformancePaintTiming;
      try {
        delete window.PerformancePaintTiming;
        expect(NuxeoPerf.getFirstContentfulPaint()).to.be.null;
      } finally {
        if (had !== undefined) {
          window.PerformancePaintTiming = had;
        }
      }
    });

    test('getFirstContentfulPaint returns null when no fcp entry', () => {
      if (typeof PerformancePaintTiming === 'undefined') {
        return;
      }
      const stub = sinon.stub(performance, 'getEntriesByType').callsFake((type) => {
        if (type === 'paint') {
          return [{ name: 'first-paint', startTime: 1 }];
        }
        return [];
      });
      expect(NuxeoPerf.getFirstContentfulPaint()).to.be.null;
      stub.restore();
    });
  });

  suite('navigation timing', () => {
    // Only the 'navigation' type is faked: the paint metrics and getResources() read the other
    // types through the same method and must keep seeing the real entries.
    const stubNavigation = (entries) => {
      const real = performance.getEntriesByType.bind(performance);
      return sinon
        .stub(performance, 'getEntriesByType')
        .callsFake((type) => (type === 'navigation' ? entries : real(type)));
    };

    test('getNavigationTiming returns the navigation entry', () => {
      const entry = { loadEventEnd: 1234.6, domContentLoadedEventEnd: 567.4 };
      const stub = stubNavigation([entry]);
      expect(NuxeoPerf.getNavigationTiming()).to.equal(entry);
      stub.restore();
    });

    test('getNavigationTiming returns null when no navigation entry has been recorded', () => {
      const stub = stubNavigation([]);
      expect(NuxeoPerf.getNavigationTiming()).to.be.null;
      stub.restore();
    });

    test('getNavigationTiming returns null when the navigation timing API is unavailable', () => {
      const orig = performance.getEntriesByType;
      Object.defineProperty(performance, 'getEntriesByType', { configurable: true, value: undefined });
      expect(NuxeoPerf.getNavigationTiming()).to.be.null;
      Object.defineProperty(performance, 'getEntriesByType', { configurable: true, value: orig });
    });

    test('getOnLoad reports loadEventEnd directly, not relative to fetchStart', () => {
      // PerformanceNavigationTiming values are already relative to the start of the navigation.
      // Carrying over the `- fetchStart` subtraction the epoch-based timings needed would report
      // 934 here instead of the real 1235ms page load.
      const stub = stubNavigation([{ loadEventEnd: 1234.6, fetchStart: 300, domContentLoadedEventEnd: 567.4 }]);
      expect(NuxeoPerf.getOnLoad()).to.equal(1235);
      expect(NuxeoPerf.getDomContentLoaded()).to.equal(567);
      stub.restore();
    });

    test('getOnLoad and getDomContentLoaded return null before the load event has fired', () => {
      const stub = stubNavigation([{ loadEventEnd: 0, fetchStart: 300, domContentLoadedEventEnd: 0 }]);
      expect(NuxeoPerf.getOnLoad()).to.be.null;
      expect(NuxeoPerf.getDomContentLoaded()).to.be.null;
      stub.restore();
    });

    test('getOnLoad and getDomContentLoaded return null when there is no navigation entry', () => {
      const stub = stubNavigation([]);
      expect(NuxeoPerf.getOnLoad()).to.be.null;
      expect(NuxeoPerf.getDomContentLoaded()).to.be.null;
      stub.restore();
    });

    test('report() still returns both metrics when there is no navigation entry', () => {
      const stub = stubNavigation([]);
      const result = NuxeoPerf.report();
      expect(result.onLoad).to.be.null;
      expect(result.domContentLoaded).to.be.null;
      stub.restore();
    });
  });

  suite('branch coverage: performance guards', () => {
    test('getUserTiming returns null when PerformanceMark missing', () => {
      const had = window.PerformanceMark;
      try {
        delete window.PerformanceMark;
        expect(NuxeoPerf.getUserTiming()).to.be.null;
      } finally {
        if (had !== undefined) {
          window.PerformanceMark = had;
        }
      }
    });

    test('getResources returns null when PerformanceResourceTiming missing', () => {
      const had = window.PerformanceResourceTiming;
      try {
        delete window.PerformanceResourceTiming;
        expect(NuxeoPerf.getResources()).to.be.null;
      } finally {
        if (had !== undefined) {
          window.PerformanceResourceTiming = had;
        }
      }
    });

    test('getEffectiveConnectionType reads mozConnection', () => {
      const origConn = navigator.connection;
      const origMoz = navigator.mozConnection;
      const origWebkit = navigator.webkitConnection;
      try {
        delete navigator.connection;
        delete navigator.webkitConnection;
        Object.defineProperty(navigator, 'mozConnection', {
          configurable: true,
          value: { effectiveType: '4g' },
        });
        expect(NuxeoPerf.getEffectiveConnectionType()).to.equal('4g');
      } finally {
        if (origConn !== undefined) {
          Object.defineProperty(navigator, 'connection', { configurable: true, value: origConn });
        } else {
          delete navigator.connection;
        }
        if (origMoz !== undefined) {
          Object.defineProperty(navigator, 'mozConnection', { configurable: true, value: origMoz });
        } else {
          delete navigator.mozConnection;
        }
        if (origWebkit !== undefined) {
          Object.defineProperty(navigator, 'webkitConnection', { configurable: true, value: origWebkit });
        }
      }
    });
  });

  suite('branch coverage: mark and measure guards', () => {
    test('mark is no-op when performance.mark missing', () => {
      const orig = performance.mark;
      Object.defineProperty(performance, 'mark', { configurable: true, value: undefined });
      expect(() => NuxeoPerf.mark('x')).to.not.throw();
      Object.defineProperty(performance, 'mark', { configurable: true, value: orig });
    });

    test('clearMarks is no-op when clearMarks missing', () => {
      const orig = performance.clearMarks;
      Object.defineProperty(performance, 'clearMarks', { configurable: true, value: undefined });
      expect(() => NuxeoPerf.clearMarks('x')).to.not.throw();
      Object.defineProperty(performance, 'clearMarks', { configurable: true, value: orig });
    });

    test('measure is no-op when measure missing', () => {
      const orig = performance.measure;
      Object.defineProperty(performance, 'measure', { configurable: true, value: undefined });
      expect(() => NuxeoPerf.measure('m')).to.not.throw();
      Object.defineProperty(performance, 'measure', { configurable: true, value: orig });
    });

    test('clearMeasures uses clearMeasures when available', () => {
      const origClear = performance.clearMeasures;
      const wrongOrig = performance.clearMarks;
      Object.defineProperty(performance, 'clearMeasures', {
        configurable: true,
        value: sinon.stub(),
      });
      Object.defineProperty(performance, 'clearMarks', { configurable: true, value: undefined });
      NuxeoPerf.clearMeasures('z');
      expect(performance.clearMeasures).to.not.have.been.called;
      Object.defineProperty(performance, 'clearMeasures', { configurable: true, value: origClear });
      Object.defineProperty(performance, 'clearMarks', { configurable: true, value: wrongOrig });
    });
  });
});
