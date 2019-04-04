import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-input.js';

window.customElements.define('dummy-layout', class extends mixinBehaviors([LayoutBehavior], Nuxeo.Element) {

  static get is() {
    return 'dummy-layout';
  }

  static get template() {
    return html`
      <style>
        *[role='widget'] {
          margin-bottom: 16px;
        }
        
        label {
          @apply --nuxeo-label;
        }

        div {
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          -webkit-hyphens: auto;
          -moz-hyphens: auto;
          -ms-hyphens: auto;
          -o-hyphens: auto;
          hyphens: auto;
        }

        div.multiline {
          white-space: pre-line;
        }

        nuxeo-document-viewer {
          @apply --paper-card;
        }

        nuxeo-note-editor {
          @apply --paper-card;
        }
      </style>

      <nuxeo-input role="widget" name="title" label="[[i18n('label.dublincore.title')]]" value="{{document.properties.dc:title}}"></nuxeo-input>
      <div role="widget">
        <label>[[i18n('label.dublincore.description')]]</label>
        <div name="description">[[document.properties.dc:description]]</div>
      </div>
    `;
  }

  static get properties() {
    return {
      document: { type: Object },
    };
  }
});
