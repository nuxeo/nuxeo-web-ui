/**
 * @license
 * (C) Copyright Nuxeo Corp. (http://nuxeo.com/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

window.Nuxeo = window.Nuxeo || {};

// inspired by https://github.com/treosh/uxm
Nuxeo.Performance = {

  /** metrics **/

  getFirstPaint: function() {
    if (typeof PerformancePaintTiming === 'undefined') {
      return null;
    }
    var fp = performance.getEntriesByType('paint').find(function(entry) {
      return entry.name === 'first-paint';
    });
    return fp ? Math.round(fp.startTime) : null;
  },

  getFirstContentfulPaint: function() {
    if (typeof PerformancePaintTiming === 'undefined') {
      return null;
    }
    var fcp = performance.getEntriesByType('paint').find(function(entry) {
      return entry.name === 'first-contentful-paint';
    });
    return fcp ? Math.round(fcp.startTime) : null;
  },

  getOnLoad: function() {
    if (!performance || !performance.timing) {
      return null;
    }
    return performance.timing.loadEventEnd - performance.timing.fetchStart;
  },

  getDomContentLoaded: function() {
    if (!performance || !performance.timing) {
      return null;
    }
    return performance.timing.domContentLoadedEventEnd - performance.timing.fetchStart;
  },

  getDomInteractive: function() {
    if (!performance || !performance.timing) {
      return null;
    }
    return performance.timing.domInteractive - performance.timing.fetchStart;
  },

  getDomComplete: function() {
    if (!performance || !performance.timing) {
      return null;
    }
    return performance.timing.domComplete - performance.timing.fetchStart;
  },

  /** optional metrics **/

  getDeviceType: function(ua) {
    // get device type
    // based on https://github.com/matthewhudson/current-device/blob/master/src/index.js
    // returns “phone”, “tablet”, or “desktop”
    ua = (ua || this.getUserAgent()).toLowerCase();
    var find = function(str) {
      return ua.indexOf(str) !== -1;
    }

    // windows
    var isWindows = find('windows');
    var isWindowsPhone = isWindows && find('phone');
    var isWindowsTablet = isWindows && (find('touch') && !isWindowsPhone);

    // ios
    var isIphone = !isWindows && find('iphone');
    var isIpod = find('ipod');
    var isIpad = find('ipad');

    // android
    var isAndroid = !isWindows && find('android');
    var isAndroidPhone = isAndroid && find('mobile');
    var isAndroidTablet = isAndroid && !find('mobile');

    // detect device
    var isPhone = isAndroidPhone || isIphone || isIpod || isWindowsPhone;
    var isTablet = isIpad || isAndroidTablet || isWindowsTablet;
    return isPhone ? 'phone' : isTablet ? 'tablet' : 'desktop';
  },

  getEffectiveConnectionType: function() {
    var conn = typeof navigator !== 'undefined' ?
               navigator.connection || navigator.mozConnection || navigator.webkitConnection :
               null;
    return conn ? conn.effectiveType : null;
  },

  getUrl: function() {
    return window.location.href;
  },

  getUserAgent: function() {
    return window.navigator.userAgent;
  },

  getUserTiming: function() {
    if (!performance || typeof PerformanceMark === 'undefined') {
      return null;
    }
    var marks = performance.getEntriesByType('mark').map(function(mark) {
      return { type: 'mark', name: mark.name, startTime: Math.round(mark.startTime) };
    });
    var measures = performance.getEntriesByType('measure').map(function(measure) {
      return {
        type: 'measure',
        name: measure.name,
        startTime: Math.round(measure.startTime),
        duration: Math.round(measure.duration)
      }
    });
    return marks.concat(measures);
  },

  getResources: function() {
    if (!performance || typeof PerformanceResourceTiming === 'undefined') {
      return null;
    }
    return performance.getEntriesByType('navigation').concat(performance.getEntriesByType('resource'))
      .map(function(entry) {
        return {
          url: entry.name,
          type: entry.initiatorType,
          size: entry.transferSize,
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration)
        }
      });
  },

  getLongTasks: function() {
    if (typeof window.__lt === 'undefined') {
      return null;
    }
    return window.__lt.e.map(function(longTask) {
      return {
        startTime: Math.round(longTask.startTime),
        duration: Math.round(longTask.duration)
      };
    });
  },

  /** reporting **/

  mark: function(name) {
    if (performance && performance.mark) {
      performance.mark(name);
    }
  },

  measure: function(name, starMark, endMark) {
    if (performance && performance.measure) {
      performance.measure(name, starMark, endMark);
    }
  },

  report: function(options) {
    if (typeof options === 'undefined') {
      options = {};
    }
    var result = {
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      domContentLoaded: this.getDomContentLoaded(),
      onLoad: this.getOnLoad(),
      domInteractive: this.getDomInteractive(),
      domComplete: this.getDomComplete()
    }
    if (options.deviceType || options.all) {
      result.deviceType = this.getDeviceType();
    }
    if (options.effectiveConnectionType || options.all) {
      result.effectiveConnectionType = this.getEffectiveConnectionType();
    }
    if (options.url || options.all) {
      result.url = this.getUrl();
    }
    if (options.userAgent || options.all) {
      result.userAgent = this.getUserAgent();
    }
    if (options.userTiming || options.all) {
      result.userTiming = this.getUserTiming();
    }
    if (options.longTasks || options.all) {
      result.longTasks = this.getLongTasks();
    }
    if (options.resources || options.all) {
      result.resources = this.getResources();
    }
    return result;
  }
};
