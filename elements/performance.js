/**
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

// inspired by https://github.com/treosh/uxm
export const Performance = {
  /** metrics * */

  /**
   * The PerformanceNavigationTiming entry for the current document, or null when it is not
   * available. Unlike the removed `performance.timing`, which always exposed an object, the
   * navigation entry list is empty before the navigation is recorded and in contexts that have
   * no navigation of their own, so callers must not index into it blindly.
   */
  getNavigationTiming() {
    if (typeof performance.getEntriesByType !== 'function') {
      return null;
    }
    const [navigation] = performance.getEntriesByType('navigation');
    return navigation || null;
  },

  getFirstPaint() {
    // The legacy `performance.timing.msFirstPaint` / `timeToNonBlankPaint` substitutes only ever
    // existed on the removed PerformanceTiming interface, in EdgeHTML and behind a Firefox pref.
    // Every browser Web UI supports implements Paint Timing, so there is nothing to fall back to.
    if (typeof PerformancePaintTiming === 'undefined') {
      return null;
    }
    const fp = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-paint');
    return fp ? Math.round(fp.startTime) : null;
  },

  getFirstContentfulPaint() {
    if (typeof PerformancePaintTiming === 'undefined') {
      return null;
    }
    const fcp = performance.getEntriesByType('paint').find((entry) => entry.name === 'first-contentful-paint');
    return fcp ? Math.round(fcp.startTime) : null;
  },

  getOnLoad() {
    const navigation = this.getNavigationTiming();
    // Both fields are relative to the start of the navigation, unlike the epoch timestamps
    // `performance.timing` exposed, so the difference keeps the fetchStart baseline the metric has
    // always used. Reporting loadEventEnd on its own would silently fold in redirect and unload
    // time. loadEventEnd stays 0 until the load event has fired.
    return navigation?.loadEventEnd ? Math.round(navigation.loadEventEnd - navigation.fetchStart) : null;
  },

  getDomContentLoaded() {
    const navigation = this.getNavigationTiming();
    return navigation?.domContentLoadedEventEnd
      ? Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart)
      : null;
  },

  /** optional metrics * */

  getDeviceType(ua) {
    // get device type
    // based on https://github.com/matthewhudson/current-device/blob/master/src/index.js
    // returns “phone”, “tablet”, or “desktop”
    ua = (ua || this.getUserAgent()).toLowerCase();
    const find = function (str) {
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
    // getResources() reports null where the resource timing API is unavailable
    const resources = this.getResources() || [];
    // sort a copy, so that neither the ordering nor the length of the counted list is disturbed
    const lastResource = [...resources].sort((a, b) => a.startTime - b.startTime).pop();
    return {
      finish: lastResource && lastResource.startTime + lastResource.duration,
      requestCount: resources.length,
      transferSize: resources.map((resource) => resource.transfered).reduce((a, b) => a + b, 0),
      size: resources.map((resource) => resource.size).reduce((a, b) => a + b, 0),
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
