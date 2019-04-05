import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';

window.customElements.define(
  'nuxeo-workspace-metadata-layout',
  class extends mixinBehaviors([LayoutBehavior], Nuxeo.Element) {
    static get is() {
      return 'nuxeo-workspace-metadata-layout';
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

        <div role="widget">
          <label>[[i18n('label.dublincore.title')]]</label>
          <div document="title">[[document.properties.dc:title]]</div>
        </div>
        <div role="widget">
          <label>[[i18n('label.dublincore.description')]]</label>
          <div document="description">[[document.properties.dc:description]]</div>
        </div>
        <div role="widget">
          <label>[[i18n('label.dublincore.nature')]]</label>
          <div name="nature">[[formatDirectory(document.properties.dc:nature)]]</div>
        </div>
      `;
    }

    static get properties() {
      return {
        document: { type: Object },
      };
    }
  },
);
