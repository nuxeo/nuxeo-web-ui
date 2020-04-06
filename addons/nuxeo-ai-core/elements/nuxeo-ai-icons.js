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
        <g id="bots-off" fill="none" fill-rule="evenodd">
          <g id="AI-Bot-off">
            <polygon id="Bounding-Box" points="0 0 24 0 24 24 0 24"></polygon>
            <path
              d="M17.2622202,8.85721435 C17.9232202,8.85721435 18.4592202,9.48321435 18.4592202,10.2572143 L18.4592202,14.2632143 L20.0272202,15.8392143 L20.0272202,10.2572143 C20.0272202,8.53121435 18.8312202,7.13221435 17.3562202,7.13221435 L12.7102202,7.13221435 L12.7112202,4.70421435 C12.7112202,4.30321435 12.3862202,3.97821435 11.9842202,3.97821435 C11.5832202,3.97821435 11.2572202,4.30321435 11.2572202,4.70421435 L11.2572202,7.02321435 L13.0822202,8.85721435 L17.2622202,8.85721435 Z"
              id="Fill-1"
              fill="#3A3A54"
            ></path>
            <path
              d="M9.97562021,16.0515143 C9.97562021,16.4525143 10.3006202,16.7795143 10.7026202,16.7795143 L13.2666202,16.7795143 C13.6676202,16.7795143 13.9926202,16.4525143 13.9926202,16.0515143 C13.9926202,15.6505143 13.6676202,15.3245143 13.2666202,15.3245143 L10.7026202,15.3245143 C10.3006202,15.3245143 9.97562021,15.6505143 9.97562021,16.0515143"
              id="Fill-3"
              fill="#3A3A54"
            ></path>
            <path
              d="M8.42732021,11.9778143 C7.87532021,11.9778143 7.42732021,12.4258143 7.42732021,12.9778143 C7.42732021,13.5298143 7.87532021,13.9778143 8.42732021,13.9778143 C8.97932021,13.9778143 9.42732021,13.5298143 9.42732021,12.9778143 C9.42732021,12.4258143 8.97932021,11.9778143 8.42732021,11.9778143"
              id="Fill-5"
              fill="#3A3A54"
            ></path>
            <path
              d="M6.60452021,18.2537143 C5.94352021,18.2537143 5.40752021,17.6267143 5.40752021,16.8537143 L5.40752021,10.2567143 C5.40752021,9.48371435 5.94352021,8.85771435 6.60452021,8.85771435 L7.48252021,8.85771435 L16.8295202,18.2537143 L6.60452021,18.2537143 Z M22.8815202,21.5017143 L4.21152021,2.73271435 L2.79352021,4.14271435 L5.91852021,7.28371435 C4.82652021,7.67671435 4.02752021,8.85171435 4.02752021,10.2567143 L4.02752021,16.8537143 C4.02752021,18.5787143 5.22352021,19.9777143 6.69852021,19.9777143 L17.3555202,19.9777143 C17.6995202,19.9777143 18.0245202,19.8957143 18.3245202,19.7567143 L21.4635202,22.9117143 L22.8815202,21.5017143 Z"
              id="Fill-7"
              fill="#3A3A54"
            ></path>
          </g>
        </g>
        <g id="bots-on" fill="none" fill-rule="evenodd">
          <defs>
            <path
              d="M6.57697807,8.87931034 C5.91590534,8.87931034 5.38,9.5061117 5.38,10.2793103 L5.38,16.8758621 C5.38,17.6490607 5.91590534,18.2758621 6.57697807,18.2758621 L17.2348001,18.2758621 C17.8958728,18.2758621 18.4317781,17.6490607 18.4317781,16.8758621 L18.4317781,10.2793103 C18.4317781,9.5061117 17.8958728,8.87931034 17.2348001,8.87931034 L6.57697807,8.87931034 Z M11.9568998,4 C12.3582654,4 12.6836365,4.3253711 12.6836365,4.72673669 L12.683,7.155 L17.328911,7.15517241 C18.8041127,7.15517241 20,8.55389661 20,10.2793103 L20,16.8758621 C20,18.6012758 18.8041127,20 17.328911,20 L6.671089,20 C5.19588728,20 4,18.6012758 4,16.8758621 L4,10.2793103 C4,8.55389661 5.19588728,7.15517241 6.671089,7.15517241 L11.23,7.155 L11.2301632,4.72673669 C11.2301632,4.3253711 11.5555343,4 11.9568998,4 Z M13.2387838,15.3474494 L10.6750158,15.3474494 C10.2736502,15.3474494 9.94827915,15.6728205 9.94827915,16.0741861 C9.94827915,16.4755517 10.2736502,16.8009228 10.6750158,16.8009228 L10.6750158,16.8009228 L13.2387838,16.8009228 C13.6401494,16.8009228 13.9655205,16.4755517 13.9655205,16.0741861 C13.9655205,15.6728205 13.6401494,15.3474494 13.2387838,15.3474494 L13.2387838,15.3474494 Z M8.4,12 C7.84771525,12 7.4,12.4477153 7.4,13 C7.4,13.5522847 7.84771525,14 8.4,14 C8.95228475,14 9.4,13.5522847 9.4,13 C9.4,12.4477153 8.95228475,12 8.4,12 Z M15.4,12 C14.8477153,12 14.4,12.4477153 14.4,13 C14.4,13.5522847 14.8477153,14 15.4,14 C15.9522847,14 16.4,13.5522847 16.4,13 C16.4,12.4477153 15.9522847,12 15.4,12 Z"
              id="path-1"
            ></path>
          </defs>
          <g id="BOT-ON" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="icon/ai/robot">
              <polygon id="Bounding-Box" points="0 0 24 0 24 24 0 24"></polygon>
              <mask id="mask-2" fill="white">
                <use xlink:href="#path-1"></use>
              </mask>
              <use id="Rectangle-path" fill="#000000" fill-rule="nonzero" xlink:href="#path-1"></use>
              <g id="color/text/nuxeo-text-default" mask="url(#mask-2)" fill="#3A3A54" fill-rule="evenodd">
                <polygon id="Rectangle" points="0 0 24 0 24 24 0 24"></polygon>
              </g>
            </g>
          </g>
        </g>
      </defs>
    </svg>
  </iron-iconset-svg>
`;

document.head.appendChild(template.content);
