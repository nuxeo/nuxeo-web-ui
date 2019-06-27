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
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { IronOverlayBehavior } from '@polymer/iron-overlay-behavior/iron-overlay-behavior.js';
import { NeonAnimationRunnerBehavior } from '@polymer/neon-animation/neon-animation-runner-behavior.js';
import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/iron-image/iron-image.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import AISuggestionMixin from '../nuxeo-ai-suggestion-mixin.js';
import '../nuxeo-ai-icons.js';
import '../nuxeo-ai-suggestion-formatter-styles.js';

class DocumentAISuggestionDetails extends mixinBehaviors(
  [IronOverlayBehavior, NeonAnimationRunnerBehavior],
  AISuggestionMixin(Nuxeo.Element),
) {
  static get template() {
    return html`
      <style>
        :host {
          @apply --shadow-elevation-2dp;
          @apply --layout-vertical;
          background: var(--nuxeo-box);
          overflow: hidden;
          user-select: text;
        }
        #close {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 10px;
          width: 32px;
          height: 32px;
        }
        #container {
          padding: 12px;
          overflow: auto;
          cursor: auto;
        }
      </style>
      <div id="container">
        <slot></slot>
      </div>
      <paper-icon-button id="close" noink icon="nuxeo:clear" on-tap="close"></paper-icon-button>
    `;
  }

  static get is() {
    return 'nuxeo-document-ai-suggestion-details';
  }

  ready() {
    super.ready();
    this.addEventListener('click', (e) => e.stopPropagation());
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('neon-animation-finish', this._onNeonAnimationFinish);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('neon-animation-finish', this._onNeonAnimationFinish);
  }

  _renderOpened() {
    this.cancelAnimation();
    this.playAnimation('entry');
  }

  _renderClosed() {
    this.cancelAnimation();
    this.playAnimation('exit');
  }

  _onNeonAnimationFinish() {
    if (this.opened) {
      this._finishRenderOpened();
    } else {
      this._finishRenderClosed();
    }
  }
}
customElements.define(DocumentAISuggestionDetails.is, DocumentAISuggestionDetails);

class DocumentAISuggestionFormatter extends AISuggestionMixin(Nuxeo.Element) {
  static get template() {
    return html`
      <style include="nuxeo-ai-suggestion-formatter-styles">
        :host {
          padding: 0 0 0 5px;
        }
        #main {
          @apply --layout-horizontal;
          @apply --layout-center;
          padding: 5px 0 5px 9px;
          overflow: hidden;
        }
        #split {
          margin-left: 8px;
        }
        #split:active {
          background-color: #ceced4;
        }
        #content {
          @apply --layout-vertical;
          font-size: 11px;
          line-height: normal;
        }
        #content p {
          margin-block-start: 0.25em;
          margin-block-end: 0.25em;
        }
        #content .thumbnail {
          width: 216px;
          height: 72px;
        }
        #content .title {
          font-weight: bold;
        }
        #content .path {
          opacity: 0.6;
        }
        paper-icon-button {
          width: 32px;
          height: 24px;
          padding: 4px;
          margin: 2px 0;
          border-left: 1px solid var(--divider-color);
        }
        nuxeo-document-ai-suggestion-details {
          cursor: default;
          max-width: 320px;
          max-height: 248px;
        }

        @media only screen and (orientation: portrait) and (max-width: 480px) {
          nuxeo-document-ai-suggestion-details {
            cursor: default;
            left: 0 !important;
            right: 0;
            bottom: 0;
            top: unset !important;
            max-width: unset !important;
          }
        }
      </style>
      <div id="main">
        <span>[[suggestion.value.title]]</span>
        <iron-icon icon="[[_getConfidenceIcon(suggestion.confidence)]]"></iron-icon>
      </div>
      <div id="split" on-click="_open">
        <paper-icon-button icon="icons:arrow-drop-down" noink></paper-icon-button>
      </div>
      <nuxeo-document-ai-suggestion-details
        id="details"
        vertical-align="top"
        horizontal-align="right"
        dynamic-align
        no-overlap
        vertical-offset="16"
        scroll-action="refit"
        auto-fit-on-attach
      >
        <div id="content">
          <dom-if if="[[suggestion.value.properties.file:content.data]]">
            <template>
              <iron-image
                class="thumbnail"
                position="left"
                sizing="contain"
                src="[[_thumbnail(suggestion.value)]]"
              ></iron-image>
            </template>
          </dom-if>
          <p class="title">
            [[suggestion.value.title]]
          </p>
          <p class="description" hidden$="[[!suggestion.value.properties.dc:description]]">
            [[suggestion.value.properties.dc:description]]
          </p>
          <p class="path">[[suggestion.value.path]]</p>
        </div>
      </nuxeo-document-ai-suggestion-details>
      <div id="anchor"></div>
    `;
  }

  static get is() {
    return 'nuxeo-document-ai-suggestion-formatter';
  }

  ready() {
    super.ready();
    this.$.details.positionTarget = this.$.anchor;
    this._handleResize = () => {
      if (window.matchMedia('only screen and (orientation: portrait) and (max-width: 480px)').matches) {
        this.$.details.entryAnimation = 'slide-from-bottom-animation';
        this.$.details.exitAnimation = 'slide-down-animation';
      } else {
        this.$.details.entryAnimation = 'fade-in-animation';
        this.$.details.exitAnimation = 'fade-out-animation';
      }
    };
    this._handleResize();
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this._handleResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this._handleResize);
  }

  _open(e) {
    e.stopPropagation();
    if (!this.$.details.opened && !this.$.details.__isAnimating) {
      this.$.details.open();
    }
  }

  _thumbnail(doc) {
    return doc &&
      doc.uid &&
      doc.contextParameters &&
      doc.contextParameters.thumbnail &&
      doc.contextParameters.thumbnail.url
      ? doc.contextParameters.thumbnail.url
      : '';
  }
}
customElements.define(DocumentAISuggestionFormatter.is, DocumentAISuggestionFormatter);
Nuxeo.DocumentAISuggestionFormatter = DocumentAISuggestionFormatter;

export default DocumentAISuggestionFormatter;
