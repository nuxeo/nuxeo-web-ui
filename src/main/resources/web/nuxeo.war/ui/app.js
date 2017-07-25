function finishLazyLoading() {
  window.Polymer = window.Polymer || {dom: 'lazyRegister'};

  var checkImportLoaded = function() {
    var links = document.querySelectorAll('link[rel="import"]');
    for (var i = 0; i < links.length; i++) {
      if (!links[i].import || links[i].import.readyState !== 'complete') {
        links[i].addEventListener('load', checkImportLoaded);
        return;
      }
    }
    var loadEl = document.getElementById('loader');
    loadEl.remove();
  };

  window.setTimeout(function() {
    document.getElementById('loader').style.display = "block";
  }, 500);

  checkImportLoaded();
}
