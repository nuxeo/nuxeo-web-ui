/*
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
import '@polymer/iron-iconset-svg/iron-iconset-svg.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

const template = html`
  <iron-iconset-svg name="nuxeo-drive" size="32">
    <svg viewBox="0 0 32 32">
      <defs>
        <g id="transfer">
          <path
            d="M20.688 17.875h7.188q0.75 0 0.875 0.75v0.188l0.063 7.188q0 0.563-0.531 0.813t-0.969-0.125l-2.375-2.375-4.188 4.188q-0.563 0.563-1.313 0.563t-1.313-0.563q-0.5-0.5-0.531-1.188t0.406-1.25l0.125-0.125 4.25-4.188-2.313-2.313q-0.438-0.438-0.25-0.969t0.75-0.594h0.125zM16 2.688l8 8v4.5h-2.688v-3.188h-6.625v-6.688h-8v18.688h9.625l-0.063 0.063q-1.063 1.063-1.25 2.625h-8.375q-1 0-1.75-0.719t-0.875-1.719v-18.938q0-1 0.688-1.781t1.75-0.844h9.563z"
          />
        </g>
        <g id="download" transform="scale(1.333)">
          <path
            d="M9.55555555,15 L9.55555555,20.4444445 L20.4444445,20.4444445 L20.4444445,15 L22,15 L22,20.4444445 C22,21.3 21.3,22 20.4444445,22 L20.4444445,22 L9.55555555,22 C8.7,22 8,21.3 8,20.4444445 L8,20.4444445 L8,15 L9.55555555,15 Z M15.8,8 L15.8,15.8792592 L17.872,13.777037 L19,14.9259259 L15,19 L11,14.9259259 L12.128,13.777037 L14.2,15.8792592 L14.2,8 L15.8,8 Z M4.4372,2 L8,5.5628 L11.5628,2 L14,2 L14,4.4384 L10.4372,8 L12.941,10.503 L12.9411765,12.9830409 L11.3602941,11.3900585 L10.38,12.818 L8,10.4384 L4.4372,14.0012 L2,14.0012 L2,11.5628 L5.5628,8 L2,4.4384 L2,2 L4.4372,2 Z"
          />
        </g>
      </defs>
    </svg>
  </iron-iconset-svg>
`;

document.head.appendChild(template.content.cloneNode(true));