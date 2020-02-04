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
import './elements/nuxeo-attach-rule-button.js';
import './elements/nuxeo-hold-toggle-button.js';
import './elements/nuxeo-retention-behavior.js';
import './elements/nuxeo-retention-events.js';
import './elements/nuxeo-retention-menu.js';
import './elements/nuxeo-retain-button.js';

import html from './nuxeo-retention.html';

const tmpl = document.createElement('template');
tmpl.innerHTML = html;
document.head.appendChild(tmpl.content);
