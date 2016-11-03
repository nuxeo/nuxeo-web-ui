/*
 * (C) Copyright 2016 Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Contributors:
 *    Gabriel Barata <gbarata@nuxeo.com>
 */

window.nuxeo = window.nuxeo || {};
window.nuxeo.I18n = window.nuxeo.I18n || {};

/**
 * Translates the given key.
 * Also accepts a default value and multiple arguments which will be replaced on the value.
 */
window.nuxeo.I18n.translate = function (key, defaultValue) {
  var language = window.nuxeo.I18n.language || 'en';
  var value = (window.nuxeo.I18n[language] && window.nuxeo.I18n[language][key]) || defaultValue || key;
  var params = Array.prototype.slice.call(arguments, 2);
  for (var i = 0; i < params.length; i++) {
    value = value.replace('{' + i + '}', params[i]);
  } // improve this to use both numbered and named parameters
  return value;
};

/**
 * loads a locale using a locale resolver
 */
window.nuxeo.I18n.loadLocale = function() {
  return window.nuxeo.I18n.localeResolver ? window.nuxeo.I18n.localeResolver().then(function() {
    document.dispatchEvent(new Event('i18n-locale-loaded'));
  }) : new Promise(function() {});
};

/**
 * The default locale resolver that reads labels from JSON files in a folder, with format messages.<language>.json
 */
function XHRLocaleResolver(msgFolder) {
  return function() {
    return new Promise(function(resolve,reject) {
      function loadLang(url) {
        var referenceFile = msgFolder +  '/messages.json';
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              window.nuxeo.I18n[language] = JSON.parse(this.response); // cache this locale
              resolve(this.response);
            } else if (xhr.status === 404 && url !== referenceFile) {
              console.log('Could not find locale "' + language + '". Defaulting to "en".');
              loadLang(referenceFile); // default to messages.json
            }
          }
        };
        xhr.onerror = function() {
          console.error('Failed to load ' + url);
        };
        xhr.send();
      }
      var language = window.nuxeo.I18n.language || 'en';
      var url = msgFolder +  '/messages' + (language === 'en' ? '' : '-' + language)  + '.json';
      loadLang(url);
    });
  }
}
