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
    if (typeof PerformancePaintTiming !== 'undefined') {
      var fp = performance.getEntriesByType('paint').find(function(entry) {
        return entry.name === 'first-paint';
      });
      return fp ? Math.round(fp.startTime) : null;
    } else {
      // fallback for Edge and FF if dom.performance.time_to_non_blank_paint.enabled:true
      var fpt = performance.timing.timeToNonBlankPaint || performance.timing.msFirstPaint;
      return fpt ? fpt - performance.timing.fetchStart : null;
    }

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
          transfered: entry.transferSize,
          size: entry.decodedBodySize,
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

  getNetworkStats: function() {
    var resources = this.getResources();
    var lastResource = this.getResources().sort(function(a, b) {
      return a.startTime > b.startTime;
    }).pop();
    return {
      finish: lastResource && (lastResource.startTime + lastResource.duration),
      requestCount: resources.length,
      transferSize: resources.map(function(resource) {
        return resource.transfered;
      }).reduce(function(a, b) {
        return a + b;
      }),
      size: resources.map(function(resource) {
        return resource.size;
      }).reduce(function(a, b) {
        return a + b;
      })
    }
  },

  /** reporting **/

  mark: function() {
    if (performance && performance.mark) {
      performance.mark.apply(performance, arguments);
    }
  },

  clearMarks: function() {
    if (performance && performance.clearMarks) {
      performance.clearMarks.apply(performance, arguments);
    }
  },

  markUnique: function() {
    this.clearMarks(arguments[0]);
    this.mark.apply(this, arguments);
  },

  measure: function() {
    if (performance && performance.measure) {
      // temporary fix for Edge: https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/4933422/
      performance.measure.apply(performance, Array.from(arguments).filter(Boolean));
    }
  },

  clearMeasures: function() {
    if (performance && performance.clearMarks) {
      performance.clearMeasures.apply(performance, arguments);
    }
  },

  measureUnique: function() {
    this.clearMeasures(arguments[0]);
    this.measure.apply(this, arguments);
  },

  report: function(options) {
    if (typeof options === 'undefined') {
      options = {};
    }
    var result = {
      domContentLoaded: this.getDomContentLoaded(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      firstPaint: this.getFirstPaint(),
      onLoad: this.getOnLoad(),
      userAgent: this.getUserAgent(),
      userTiming: this.getUserTiming()
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
    if (options.longTasks || options.all) {
      result.longTasks = this.getLongTasks();
    }
    if (options.resources || options.all) {
      result.resources = this.getResources();
    }
    if (options.networkStats || options.all) {
      result.networkStats = this.getNetworkStats();
    }
    return result;
  }
};
