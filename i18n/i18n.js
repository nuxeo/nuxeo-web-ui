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
import { XHRLocaleResolver } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

window.nuxeo = window.nuxeo || {};
window.nuxeo.I18n = window.nuxeo.I18n || {};
const baseUrl = window.nuxeo.I18n.baseUrl || window.location.origin + window.location.pathname;
const msgFolder = `${baseUrl + (baseUrl.endsWith('/') ? '' : '/')}i18n`;
window.nuxeo.I18n.language = navigator.language || navigator.userLanguage || 'en';
window.nuxeo.I18n.localeResolver = new XHRLocaleResolver(msgFolder);
const I18N_LOAD_TIMEOUT = 10000;
const i18nLoadTimeout = new Promise((resolve) => {
  setTimeout(() => {
    console.warn(`Locale loading timed out after ${I18N_LOAD_TIMEOUT}ms. Starting the application with fallback keys.`);
    resolve();
  }, I18N_LOAD_TIMEOUT);
});

export const i18nReady = Promise.race([window.nuxeo.I18n.loadLocale(), i18nLoadTimeout])
  .catch((error) => {
    console.error('Failed to load locale. Starting the application with fallback keys.', error);
  })
  .then(() => {
    /* Set html lang attribute. Required by the better-dateinput element */
    document.getElementsByTagName('html')[0].lang = window.nuxeo.I18n.language;
  });
