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
import '@polymer/iron-iconset-svg/iron-iconset-svg.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

const template = html`
  <iron-iconset-svg size="24" name="nuxeo-ai">
    <svg>
      <defs>
        <g id="confidence-level-low" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
          <g fill-rule="nonzero">
            <path
              d="M18,0 L22.5,0 L22.5,24 L18,24 L18,0 Z M9,8 L13.5,8 L13.5,24 L9,24 L9,8 Z"
              fill-opacity="0.3"
              fill="#9B9B9B"
            ></path>
            <polygon fill="#4A90E2" points="0 16 4.5 16 4.5 24 0 24"></polygon>
          </g>
        </g>
        <g id="confidence-level-medium" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
          <g fill-rule="nonzero">
            <polygon fill-opacity="0.3" fill="#9B9B9B" points="18 0 22.5 0 22.5 24 18 24"></polygon>
            <path d="M9,8 L13.5,8 L13.5,24 L9,24 L9,8 Z M0,16 L4.5,16 L4.5,24 L0,24 L0,16 Z" fill="#4A90E2"></path>
          </g>
        </g>
        <g id="confidence-level-high" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
          <g fill="#4A90E2" fill-rule="nonzero">
            <path
              d="M18,0 L22.5,0 L22.5,24 L18,24 L18,0 Z M9,8 L13.5,8 L13.5,24 L9,24 L9,8 Z M0,16 L4.5,16 L4.5,24 L0,24 L0,16 Z"
            ></path>
          </g>
        </g>
      </defs>
    </svg>
  </iron-iconset-svg>
`;

document.head.appendChild(template.content);
