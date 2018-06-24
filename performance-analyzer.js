// inspired by https://github.com/treosh/uxm

window.Nuxeo = window.Nuxeo || {};

Nuxeo.Performance = {};

Nuxeo.Performance.getEffectiveConnectionType = function() {
  var conn = typeof navigator !== 'undefined' ?
             navigator.connection || navigator.mozConnection || navigator.webkitConnection :
             null;
  return conn ? conn.effectiveType : null;
}

Nuxeo.Performance.getFirstPaint = function() {
  if (typeof PerformancePaintTiming === 'undefined') {
    return null;
  }
  var fp = performance.getEntriesByType('paint').find(function(entry) {
    return entry.name === 'first-paint';
  });
  return fp ? Math.round(fp.startTime) : null;
}

Nuxeo.Performance.getFirstContentfulPaint = function() {
  if (typeof PerformancePaintTiming === 'undefined') {
    return null;
  }
  var fcp = performance.getEntriesByType('paint').find(function(entry) {
    return entry.name === 'first-contentful-paint';
  });
  return fcp ? Math.round(fcp.startTime) : null;
}

Nuxeo.Performance.getOnLoad = function() {
  if (!performance || !performance.timing) {
    return null;
  }
  return performance.timing.loadEventEnd - performance.timing.fetchStart;
}

Nuxeo.Performance.getDomContentLoaded = function() {
  if (!performance || !performance.timing) {
    return null;
  }
  return performance.timing.domContentLoadedEventEnd - performance.timing.fetchStart;
}

Nuxeo.Performance.getDomInteractive = function() {
  if (!performance || !performance.timing) {
    return null;
  }
  return performance.timing.domInteractive - performance.timing.fetchStart;
}

Nuxeo.Performance.getDomComplete = function() {
  if (!performance || !performance.timing) {
    return null;
  }
  return performance.timing.domComplete - performance.timing.fetchStart;
}

// get device type
// based on https://github.com/matthewhudson/current-device/blob/master/src/index.js
// returns “phone”, “tablet”, or “desktop”

Nuxeo.Performance.getDeviceType = function(ua) {
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
}

// extra metrics

Nuxeo.Performance.getUrl = function() {
  return window.location.href;
}

Nuxeo.Performance.getUserAgent = function() {
  return window.navigator.userAgent;
}

Nuxeo.Performance.getDeviceMemory = function() {
  var deviceMemory = typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined;
  if (deviceMemory === undefined) {
    return null;
  }
  return deviceMemory > 1 ? 'full' : 'lite';
}

Nuxeo.Performance.getUserTiming = function() {
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
}

Nuxeo.Performance.getResources = function() {
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
}

Nuxeo.Performance.getLongTasks = function() {
  if (typeof window.__lt === 'undefined') {
    return null;
  }
  return window.__lt.e.map(function(longTask) {
    return {
      startTime: Math.round(longTask.startTime),
      duration: Math.round(longTask.duration)
    };
  });
}

Nuxeo.Performance.report = function(options) {
  if (typeof options === 'undefined') {
    options = {};
  }
  var result = {
    deviceType: this.getDeviceType(),
    effectiveConnectionType: this.getEffectiveConnectionType(),
    firstPaint: this.getFirstPaint(),
    firstContentfulPaint: this.getFirstContentfulPaint(),
    domContentLoaded: this.getDomContentLoaded(),
    onLoad: this.getOnLoad(),
    domInteractive: this.getDomInteractive(),
    domComplete: this.getDomComplete()
  }
  if (options.url || options.all) result.url = this.getUrl();
  if (options.userAgent || options.all) result.userAgent = this.getUserAgent();
  if (options.deviceMemory || options.all) result.deviceMemory = this.getDeviceMemory();
  if (options.userTiming || options.all) result.userTiming = this.getUserTiming();
  if (options.longTasks || options.all) result.longTasks = this.getLongTasks();
  if (options.resources || options.all) result.resources = this.getResources();
  return result;
}

Nuxeo.Performance.mark = function(name) {
  if (performance && performance.mark) {
    if (!performance.getEntriesByName(name, 'mark').length) {
      performance.mark(name);
      document.dispatchEvent(new Event('nuxeo-mark'));
    }
  }
}

Nuxeo.Performance.measure = function(name, starMark, endMark) {
  if (performance && performance.measure) {
    performance.measure(name, starMark, endMark);
  }
}

Nuxeo.Performance.copyReportToClipboard = function() {
  if (window.nuxeo_perf_report && window.getSelection && document.createRange) {//Browser compatibility
    var el = window.nuxeo_perf_report.querySelector('#report');
    var sel = window.getSelection();
    if(sel.toString() == '') {
      var range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("copy");
    } else {
      document.execCommand("copy");
    }
  }
}

Nuxeo.Performance.updateReport = function() {
  var report = Nuxeo.Performance.report({url: true, userAgent: true, deviceMemory: true,
    userTiming: true, longTasks: true});
  var plainText = JSON.stringify(report, null, 4);
  document.querySelector('span#report').innerHTML = plainText
    .replace(/^\s+/gm, function(m){ return m.replace(/\s/gm, '&nbsp;')}).replace(/\n/g, '<br>');

}

Nuxeo.Performance.displayReportWidget = function() {
  if (!window.nuxeo_perf_report) {
    var div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.right = '0';
    div.style.top = '55px';
    div.style.width = '300px';
    div.style.height = '50vh';
    div.style.overflowY = 'scroll';
    div.style.backgroundColor = 'rgba(0, 0, 128, 0.75)';
    div.style.color = 'white';
    div.style.padding = '8px';
    div.style.border = '1px solid black';
    div.style.zIndex = '1000';
    document.body.appendChild(div);
    window.nuxeo_perf_report = div;
  }
  var html = '<span id="report">' +
             '</span>' +
             '<button type="button" style="position: fixed; top: 65px; right: 15px; width: 64px;"' +
             'onclick="Nuxeo.Performance.updateReport()">report</button>' +
             '<button type="button" style="position: fixed; top: 90px; right: 15px; width: 64px;"' +
             'onclick="Nuxeo.Performance.copyReportToClipboard()">copy</button>';
  window.nuxeo_perf_report.innerHTML = html;
}
