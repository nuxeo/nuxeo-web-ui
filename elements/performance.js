/**
C) Copyright Nuxeo Corp. (http://nuxeo.com/)

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

// inspired by https://github.com/treosh/uxm
export const Performance = {
  /** metrics * */

  getFirstPaint() {
    if (typeof PerformancePaintTiming !== 'undefined') {
      const fp = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-paint');
      return fp ? Math.round(fp.startTime) : null;
    }
    // fallback for Edge and FF if dom.performance.time_to_non_blank_paint.enabled:true
    const fpt = performance.timing.timeToNonBlankPaint || performance.timing.msFirstPaint;
    return fpt ? fpt - performance.timing.fetchStart : null;
  },

  getFirstContentfulPaint() {
    if (typeof PerformancePaintTiming === 'undefined') {
      return null;
    }
    const fcp = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-contentful-paint');
    return fcp ? Math.round(fcp.startTime) : null;
  },

  getOnLoad() {
    if (!performance || !performance.timing) {
      return null;
    }
    return performance.timing.loadEventEnd - performance.timing.fetchStart;
  },

  getDomContentLoaded() {
    if (!performance || !performance.timing) {
      return null;
    }
    return performance.timing.domContentLoadedEventEnd - performance.timing.fetchStart;
  },

  /** optional metrics * */

  getDeviceType(ua) {
    // get device type
    // based on https://github.com/matthewhudson/current-device/blob/master/src/index.js
    // returns “phone”, “tablet”, or “desktop”
    ua = (ua || this.getUserAgent()).toLowerCase();
    const find = function(str) {
      return ua.indexOf(str) !== -1;
    };

    // windows
    const isWindows = find('windows');
    const isWindowsPhone = isWindows && find('phone');
    const isWindowsTablet = isWindows && find('touch') && !isWindowsPhone;

    // ios
    const isIphone = !isWindows && find('iphone');
    const isIpod = find('ipod');
    const isIpad = find('ipad');

    // android
    const isAndroid = !isWindows && find('android');
    const isAndroidPhone = isAndroid && find('mobile');
    const isAndroidTablet = isAndroid && !find('mobile');

    // detect device
    const isPhone = isAndroidPhone || isIphone || isIpod || isWindowsPhone;
    const isTablet = isIpad || isAndroidTablet || isWindowsTablet;
    if (isPhone) {
      return 'phone';
    }
    return isTablet ? 'tablet' : 'desktop';
  },

  getEffectiveConnectionType() {
    const conn =
      typeof navigator !== 'undefined'
        ? navigator.connection || navigator.mozConnection || navigator.webkitConnection
        : null;
    return conn ? conn.effectiveType : null;
  },

  getUrl() {
    return window.location.href;
  },

  getUserAgent() {
    return window.navigator.userAgent;
  },

  getUserTiming() {
    if (!performance || typeof PerformanceMark === 'undefined') {
      return null;
    }
    const marks = performance.getEntriesByType('mark').map((mark) => {
      return { type: 'mark', name: mark.name, startTime: Math.round(mark.startTime) };
    });
    const measures = performance.getEntriesByType('measure').map((measure) => {
      return {
        type: 'measure',
        name: measure.name,
        startTime: Math.round(measure.startTime),
        duration: Math.round(measure.duration),
      };
    });
    return marks.concat(measures);
  },

  getResources() {
    if (!performance || typeof PerformanceResourceTiming === 'undefined') {
      return null;
    }
    return performance
      .getEntriesByType('navigation')
      .concat(performance.getEntriesByType('resource'))
      .map((entry) => {
        return {
          url: entry.name,
          type: entry.initiatorType,
          transfered: entry.transferSize,
          size: entry.decodedBodySize,
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
        };
      });
  },

  getLongTasks() {
    if (typeof window.__lt === 'undefined') {
      return null;
    }
    return window.__lt.e.map((longTask) => {
      return {
        startTime: Math.round(longTask.startTime),
        duration: Math.round(longTask.duration),
      };
    });
  },

  getNetworkStats() {
    const resources = this.getResources();
    const lastResource = this.getResources()
      .sort((a, b) => a.startTime > b.startTime)
      .pop();
    return {
      finish: lastResource && lastResource.startTime + lastResource.duration,
      requestCount: resources.length,
      transferSize: resources.map((resource) => resource.transfered).reduce((a, b) => a + b),
      size: resources.map((resource) => resource.size).reduce((a, b) => a + b),
    };
  },

  /** reporting * */

  mark(...args) {
    if (performance && performance.mark) {
      performance.mark(...args);
    }
  },

  clearMarks(...args) {
    if (performance && performance.clearMarks) {
      performance.clearMarks(...args);
    }
  },

  markUnique(...args) {
    this.clearMarks(args[0]);
    this.mark(...args);
  },

  measure(...args) {
    if (performance && performance.measure) {
      // temporary fix for Edge: https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/4933422/
      performance.measure(...Array.from(args).filter(Boolean));
    }
  },

  clearMeasures(...args) {
    if (performance && performance.clearMarks) {
      performance.clearMeasures(...args);
    }
  },

  measureUnique(...args) {
    this.clearMeasures(args[0]);
    this.measure(...args);
  },

  report(options) {
    if (typeof options === 'undefined') {
      options = {};
    }
    const result = {
      domContentLoaded: this.getDomContentLoaded(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      firstPaint: this.getFirstPaint(),
      onLoad: this.getOnLoad(),
      userAgent: this.getUserAgent(),
      userTiming: this.getUserTiming(),
    };
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
  },
};

Nuxeo.Performance = Performance;
