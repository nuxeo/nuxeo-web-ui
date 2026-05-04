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
    test('should return a number when performance.timing is available', () => {
      const result = NuxeoPerf.getOnLoad();
      if (result !== null) {
        expect(result).to.be.a('number');
      }
    });
  });

  suite('getDomContentLoaded', () => {
    test('should return a number when performance.timing is available', () => {
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
});
