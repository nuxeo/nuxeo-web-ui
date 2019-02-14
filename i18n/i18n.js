/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

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

var baseUrl = window.nuxeo.I18n.baseUrl || location.origin + location.pathname;
var msgFolder = baseUrl + (baseUrl.endsWith('/') ? '' : '/') + 'i18n';
window.nuxeo.I18n.language = navigator.language || navigator.userLanguage || 'en';
window.nuxeo.I18n.localeResolver = new XHRLocaleResolver(msgFolder);
window.nuxeo.I18n.loadLocale().then(function(){
  /* Set html lang attribute. Required by the better-dateinput element */
  document.getElementsByTagName("html")[0].lang =  window.nuxeo.I18n.language;
});
