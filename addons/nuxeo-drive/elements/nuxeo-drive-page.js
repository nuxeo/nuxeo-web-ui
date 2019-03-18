/**
(C) Copyright 2016 Nuxeo SA (http://nuxeo.com/) and contributors.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Contributors:
  Nelson Silva <nsilva@nuxeo.com>
*/
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import './nuxeo-authentication-tokens-management.js';
import './nuxeo-drive-sync-roots-management.js';
import './nuxeo-drive-desktop-packages.js';

/**
Nuxeo Drive management page.

Example:

    <nuxeo-drive-page></nuxeo-drive-page>

@group Nuxeo UI Elements
@element nuxeo-drive-page
*/
Polymer({
  _template: html`
    <style include="nuxeo-styles"></style>
    <nuxeo-page>
      <div class="header">[[i18n('drivePage.heading','Nuxeo Drive')]]</div>
      <div class="content">
        <nuxeo-card heading="[[i18n('drivePage.packages','Packages')]]">
          <nuxeo-drive-desktop-packages></nuxeo-drive-desktop-packages>
        </nuxeo-card>
        <nuxeo-card heading="[[i18n('drivePage.roots','Synchronization Roots')]]">
          <nuxeo-drive-sync-roots-management></nuxeo-drive-sync-roots-management>
        </nuxeo-card>
        <nuxeo-card heading="[[i18n('drivePage.tokens','Tokens')]]">
          <nuxeo-authentication-tokens-management application="Nuxeo Drive"></nuxeo-authentication-tokens-management>
        </nuxeo-card>
      </div>
    </nuxeo-page>
`,

  is: 'nuxeo-drive-page',
  behaviors: [I18nBehavior],
});
