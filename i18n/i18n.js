/**
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
// Imported for its side effects: it defines `window.nuxeo.I18n.translate` and
// `window.nuxeo.I18n.loadLocale`, both used below.
import '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

window.nuxeo = window.nuxeo || {};
window.nuxeo.I18n = window.nuxeo.I18n || {};
const baseUrl = window.nuxeo.I18n.baseUrl || window.location.origin + window.location.pathname;
const msgFolder = `${baseUrl + (baseUrl.endsWith('/') ? '' : '/')}i18n`;
window.nuxeo.I18n.language = navigator.language || navigator.userLanguage || 'en';

// Same contract as `XHRLocaleResolver` from nuxeo-ui-elements, but it rejects instead of going quiet.
// The upstream resolver settles only on HTTP 200, or on a 404 that falls back to messages.json;
// network errors, other 4xx/5xx responses and malformed JSON leave its promise pending forever. Since
// the bootstrap chain in index.js waits for `i18nReady`, an unsettled promise costs the user the full
// LOCALE_LOAD_TIMEOUT even when the failure is already known. Rejecting lets startup resume as soon as
// the locale is known to be unavailable. Drop this in favour of the upstream resolver once it reports
// failures.
window.nuxeo.I18n.localeResolver = () =>
  new Promise((resolve, reject) => {
    // point all english based locales to the reference file
    if (window.nuxeo.I18n.language.startsWith('en-')) {
      window.nuxeo.I18n.language = 'en';
    }
    let language = window.nuxeo.I18n.language || 'en';
    const referenceFile = `${msgFolder}/messages.json`;
    const loadLang = (url) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = () => {
        if (xhr.status === 404 && url !== referenceFile) {
          console.warn(`Could not find locale "${language}". Defaulting to "en".`);
          language = 'en';
          loadLang(referenceFile);
          return;
        }
        if (xhr.status !== 200) {
          reject(new Error(`Loading ${url} failed with status ${xhr.status}.`));
          return;
        }
        let messages;
        try {
          messages = JSON.parse(xhr.response);
        } catch (e) {
          reject(new Error(`Loading ${url} failed: the response is not valid JSON.`));
          return;
        }
        window.nuxeo.I18n[language] = messages; // cache this locale
        window.nuxeo.I18n.language = language;
        resolve(xhr.response);
      };
      xhr.onerror = () => reject(new Error(`Loading ${url} failed.`));
      xhr.send();
    };
    loadLang(`${msgFolder}/messages${language === 'en' ? '' : `-${language}`}.json`);
  });

// A request that neither responds nor errors (a blackholed connection, say) cannot be detected, and
// would hold the app on the unresolved loading shell. Cap the whole locale load, including the 404
// fallback above, so it degrades to untranslated keys instead of a blank UI. Failures the resolver can
// detect reject immediately and never consume this budget.
const LOCALE_LOAD_TIMEOUT = 5000;
let onLocaleLoadTimeout;
const localeLoadTimeout = new Promise((resolve) => {
  onLocaleLoadTimeout = resolve;
});
const timeoutId = setTimeout(() => {
  console.warn(`Loading the locale timed out after ${LOCALE_LOAD_TIMEOUT}ms, starting with untranslated keys.`);
  onLocaleLoadTimeout();
}, LOCALE_LOAD_TIMEOUT);

export const i18nReady = Promise.race([window.nuxeo.I18n.loadLocale(), localeLoadTimeout])
  .catch((error) => {
    console.warn('Failed to load the locale, starting with untranslated keys.', error);
  })
  .then(() => {
    clearTimeout(timeoutId);
    /* Set html lang attribute. Required by the better-dateinput element */
    document.getElementsByTagName('html')[0].lang = window.nuxeo.I18n.language;
  });
