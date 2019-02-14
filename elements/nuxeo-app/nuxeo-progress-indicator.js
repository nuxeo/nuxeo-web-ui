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
/**
`nuxeo-progress-indicator`
@group Nuxeo UI
@element nuxeo-progress-indicator
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-progress/paper-progress.js';
import { NeonAnimatableBehavior } from '@polymer/neon-animation/neon-animatable-behavior.js';
import { NeonAnimationRunnerBehavior } from '@polymer/neon-animation/neon-animation-runner-behavior.js';
import '@polymer/neon-animation/neon-animations.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      paper-progress {
        position: absolute;
        width: 100%;
        top: 0;
        height: 3px;
        z-index: 104;
        --paper-progress-active-color: rgba(0, 128, 255, 0.4);
        --paper-progress-container-color: transparent;
        --paper-progress-indeterminate-cycle-duration: 3s;
      }
    </style>

    <paper-progress indeterminate="" hidden\$="[[!visible]]"></paper-progress>
`,

  is: 'nuxeo-progress-indicator',
  behaviors: [NeonAnimatableBehavior, NeonAnimationRunnerBehavior],

  properties: {

    visible: {
      type: Boolean,
      value: false,
      reflectToAttribute: true,
      observer: '_visibleChanged'
    },

    animationConfig: {
      type: Object,
      value: function() {
        return {
          'fadein': [{
            name: 'fade-in-animation',
            timing: {delay: 1000, duration: 1500},
            node: this
          }]
        };
      }
    }
  },

  _visibleChanged: function(visible) {
    if (visible) {
      this.playAnimation('fadein');
    }
  }
});
