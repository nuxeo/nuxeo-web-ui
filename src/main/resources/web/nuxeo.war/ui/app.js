function finishLazyLoading() {
  window.Polymer = window.Polymer || {dom: 'lazyRegister'};

  var clear = function() {
    var loadEl = document.getElementById('loader');
    loadEl.remove();
  }

  var checkImportLoaded = function() {
    var links = document.querySelectorAll('link[rel="import"]');
    for (var i = 0; i < links.length; i++) {
      if (!links[i].import || links[i].import.readyState !== 'complete') {
        links[i].addEventListener('load', checkImportLoaded);
        return;
      }
    }
    clear();
  };

  window.setTimeout(function() {
    document.getElementById('loader').style.display = "block";
  }, 500);

  // hack for known webkit issue: https://github.com/webcomponents/webcomponentsjs/issues/499
  var ua = navigator.userAgent.toLowerCase();
  if (window.HTMLImports && ua.indexOf('safari') > -1 && ua.indexOf('chrome') === -1) {
    window.HTMLImports.whenReady(function() {
      setTimeout(clear);
    });
  }

  checkImportLoaded();
}
