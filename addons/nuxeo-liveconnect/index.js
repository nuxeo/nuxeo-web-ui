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
import './elements/nuxeo-liveconnect-box-link.js';
import './elements/nuxeo-liveconnect-dropbox-link.js';
import './elements/nuxeo-liveconnect-google-drive-link.js';
import './elements/nuxeo-liveconnect-onedrive-link.js';

import boxHtml from './nuxeo-liveconnect-box.html';
import dropboxHtml from './nuxeo-liveconnect-dropbox.html';
import driveHtml from './nuxeo-liveconnect-google-drive.html';
import onedriveHtml from './nuxeo-liveconnect-onedrive.html';

const tmpl = document.createElement('template');
tmpl.innerHTML = [boxHtml, dropboxHtml, driveHtml, onedriveHtml].join('');
document.head.appendChild(tmpl.content);
