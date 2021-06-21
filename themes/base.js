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
import '@polymer/polymer/polymer-legacy.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-button-styles.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

const template = html`
  <dom-module id="nuxeo-styles">
    <template>
      <style include="nuxeo-button-styles">
        [hidden] {
          display: none !important;
        }

        h1 {
          font-weight: 400;
          font-size: 2.46rem;
          letter-spacing: 0;
          line-height: 3.08rem;
        }

        h2 {
          font-weight: 400;
          font-size: 2.15rem;
          letter-spacing: 0;
          line-height: 2.77rem;
        }

        h3 {
          font-weight: 400;
          font-size: 1.54rem;
          letter-spacing: 0;
          line-height: 2rem;
        }

        h4 {
          font-weight: 600;
          font-size: 1.23rem;
          letter-spacing: 0;
          line-height: 1.69rem;
        }

        h5 {
          font-weight: 700;
          font-size: 1.08rem;
          letter-spacing: 0.24px;
          line-height: 1.54rem;
        }

        h6 {
          font-weight: 600;
          font-size: 1.08rem;
          letter-spacing: 0.16px;
          line-height: 1.54rem;
        }

        /* links */
        a,
        a:active,
        a:visited,
        a:focus {
          @apply --nuxeo-link;
        }
        a:hover {
          @apply --nuxeo-link-hover;
        }

        /* label */
        label {
          @apply --nuxeo-label;
        }

        /* input */
        input,
        textarea {
          font-family: var(--nuxeo-app-font);
          font-size: 1rem !important;
        }

        paper-input[readonly] paper-input-container {
          opacity: 0.6;
        }

        paper-input[readonly] .input-content.label-is-highlighted label {
          color: var(--nuxeo-text-default);
          opacity: 0.6;
        }

        paper-input[readonly] .unfocused-line,
        paper-input[readonly] .focused-line {
          border-bottom: 1px dashed var(--nuxeo-text-default);
        }

        paper-button + paper-button {
          margin-left: 8px;
        }

        paper-textarea {
          word-wrap: break-word; /* legacy property */
          overflow-wrap: break-word; /* css3 standard property */
          word-break: break-word;

          /* Hyphenize words */
          -webkit-hyphens: auto;
          -moz-hyphens: auto;
          -ms-hyphens: auto;
          -o-hyphens: auto;
          hyphens: auto;
        }

        /* nuxeo page */
        .header {
          @apply --layout-horizontal;
          @apply --layout-center;
          font-size: 1rem;
          height: 53px;
          padding: 0 16px;
          text-overflow: ellipsis;
          color: var(--nuxeo-drawer-header);
        }

        /* layouts */
        div[role='widget'] > div.multiline {
          white-space: pre-line;
        }

        div[role='widget'] > div {
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
        }

        *[role='widget'] {
          @apply --nuxeo-widget;
        }
      </style>
    </template>
  </dom-module>
  <custom-style>
    <style include="nuxeo-styles">
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: url('../fonts/Inter-Regular.woff2?v=3.13') format('woff2'),
          url('../fonts/Inter-Regular.woff?v=3.13') format('woff');
      }

      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 600;
        font-display: swap;
        src: url('../fonts/Inter-SemiBold.woff2?v=3.13') format('woff2'),
          url('../fonts/Inter-SemiBold.woff?v=3.13') format('woff');
      }

      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 700;
        font-display: swap;
        src: url('../fonts/Inter-Bold.woff2?v=3.13') format('woff2'),
          url('../fonts/Inter-Bold.woff?v=3.13') format('woff');
      }

      html {
        font-weight: 400;
        font-size: 13px;
        letter-spacing: 0.16px;
        line-height: 1.54rem;
      }

      html,
      body {
        margin: 0;
        min-height: 100%;
        color: var(--nuxeo-text-default);
        font-family: var(--nuxeo-app-font);
      }

      /* scrollbars */
      body ::-webkit-scrollbar-track {
        width: 3px;
        height: 3px;
      }
      body ::-webkit-scrollbar {
        background-color: rgba(0, 0, 0, 0.03);
        width: 3px;
        height: 3px;
      }
      body ::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.15);
        border-radius: 2px;
      }

      /* External styles */
      body .ae-toolbar-styles {
        z-index: 105;
      }

      html {
        --nuxeo-drawer-header-height: 53px;
        --nuxeo-sidebar-width: 52px;

        --nuxeo-app-top: 0px;
        --nuxeo-app-bottom: 0px;
        --nuxeo-app-header-box-shadow: 1px 0 0 rgba(0, 0, 0, 0.1) inset, 0 3px 5px rgba(0, 0, 0, 0.1);

        --nuxeo-link: {
          color: var(--nuxeo-link-color);
          text-decoration: none;
        }

        --nuxeo-link-hover: {
          color: var(--nuxeo-link-hover-color);
          cursor: pointer;
        }

        --nuxeo-sidebar: {
          background-color: var(--nuxeo-sidebar-background);
        }

        --nuxeo-sidebar-item-theme: {
          border-bottom: 1px solid var(--nuxeo-border);
          color: var(--nuxeo-drawer-text);
          display: block;
          margin: 0;
          white-space: nowrap;
        }

        --nuxeo-sidebar-item-link: {
          color: var(--nuxeo-drawer-text);
          display: block;
          padding: 1.3em;
        }

        --nuxeo-action: {
          border: 1px solid transparent;
          border-radius: 5em;
        }

        --nuxeo-action-hover: {
          border: 1px solid var(--nuxeo-primary-color);
          color: var(--nuxeo-text-default);
        }

        --nuxeo-block-hover: {
          background-color: var(--nuxeo-container-hover);
          transition: background-color 0.2s ease-in-out;
        }

        --nuxeo-block-selected: {
          background-color: var(--nuxeo-box);
          outline: 0;
          box-shadow: 5px 0 0 0 var(--nuxeo-primary-color) inset;
        }

        --nuxeo-card-margin-bottom: 16px;

        --nuxeo-card: {
          display: block;
          padding: 16px;
          margin-bottom: var(--nuxeo-card-margin-bottom, 16px);
          box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04);
          font-family: var(--nuxeo-app-font);
          border-radius: 0;
          background-color: var(--nuxeo-box);
        }

        --nuxeo-label: {
          display: block;
          opacity: 0.6;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 400 !important;
          letter-spacing: 0.005em !important;
          font-family: var(--nuxeo-app-font);
        }

        --nuxeo-tag: {
          display: inline-block;
          background-color: var(--nuxeo-tag-background);
          padding: 0.2rem 0.5rem;
          color: var(--nuxeo-tag-text);
          font-size: 0.8rem;
          letter-spacing: 0.02em;
          line-height: 1rem;
          margin-bottom: 0.3em;
          border-radius: 2em;
          text-decoration: none;
          vertical-align: baseline;
        }

        --nuxeo-user: {
          border-radius: 2.5em;
          text-transform: capitalize;
        }

        --nuxeo-dialog: {
          min-width: 480px;
        }

        --nuxeo-selectivity-label: {
          @apply --nuxeo-label;
        }

        --nx-actions: {
          display: flex;
          margin: 1em 0;
        }

        --nx-actions-button: {
          flex: 1;
        }

        --nuxeo-browser-actions-menu-max-width: 240px;

        --nuxeo-results-selection-actions-menu-max-width: 280px;

        --nuxeo-document-blob-actions-menu-max-width: 160px;

        --nuxeo-document-create-popup-height: 85vh;
        --nuxeo-document-create-popup-width: 65vw;

        --nuxeo-document-form-popup-max-height: 60vh;
        --nuxeo-document-form-popup-min-width: 915px;

        --nuxeo-action-button-label: {
          padding-right: 8px;
        }

        --nuxeo-actions-menu-dropdown: {
          padding: 0 8px;
        }

        --nx-button-hover: {
          color: var(--nuxeo-link-hover-color);
        }

        --nx-button-small: {
          min-height: 32px;
          padding: 4px 16px;
        }

        --nx-button-primary: {
          color: var(--nuxeo-button-primary-text, #ffffff);
          background-color: var(--nuxeo-button-primary, #0066ff);
          border: 1px solid var(--nuxeo-primary-color, #0066ff);
        }

        --nx-button-primary-hover: {
          color: var(--nuxeo-button-primary-text, #ffffff);
          background-color: var(--nuxeo-button-primary-focus, #1f28bf);
          border: 1px solid var(--nuxeo-button-primary-focus, #1f28bf);
        }

        --nx-button-secondary: {
          border: 1px solid var(--nuxeo-button-secondary-text, #0066ff);
          background-color: transparent;
          color: var(--nuxeo-button-secondary-text, #0066ff);
        }

        --nx-button-secondary-hover: {
          border: 1px solid var(--nuxeo-secondary-color, #1f28bf);
          color: var(--nuxeo-secondary-color, #1f28bf);
        }

        --nx-button-secondary-disabled: {
          border: 1px solid var(--disabled-text-color, #bdbdbd);
          color: var(--secondary-text-color, #939caa);
          background-color: transparent;
        }

        --nx-button-text: {
          color: var(--nuxeo-button-secondary-text, #0066ff);
        }

        --nx-button-text-hover: {
          color: var(--nuxeo-secondary-color, #1f28bf);
        }

        --nx-button-text-disabled: {
          color: var(--secondary-text-color, #939caa);
          background-color: transparent;
        }

        --nx-button-disabled: {
          color: var(--nuxeo-button-disabled-text, rgba(0, 0, 0, 0.1));
          background-color: var(--nuxeo-button-disabled, rgba(0, 0, 0, 0.05));
          border: none;
        }

        --buttons-bar: {
          padding: 0.7em 1.8em;
        }

        --iron-data-table: {
          font-family: var(--nuxeo-app-font);
        }

        --paper-tooltip: {
          font-size: 1rem;
          font-family: var(--nuxeo-app-font);
          background-color: var(--nuxeo-sidebar-background);
        }

        --paper-card: {
          display: block;
          padding: 16px;
          margin-bottom: var(--nuxeo-card-margin-bottom, 16px);
          box-shadow: 0 3px 5px rgba(0, 0, 0, 0.04) !important;
          font-family: var(--nuxeo-app-font);
          border-radius: 0;
          background-color: var(--nuxeo-box) !important;
        }

        --paper-card-header-text: {
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 1em;
          letter-spacing: 0.04em;
          color: var(--nuxeo-text-default);
        }

        --paper-radio-button: {
          font-family: var(--nuxeo-app-font);
        }

        --paper-font-common-base: {
          font-family: var(--nuxeo-app-font);
        }

        --paper-tabs: {
          border-bottom: 1px solid var(--nuxeo-border);
        }

        --paper-icon-item: {
          color: var(--nuxeo-text-default);
          font-family: var(--nuxeo-app-font);
        }

        --paper-tab: {
          color: var(--nuxeo-text-default);
          font-family: var(--nuxeo-app-font);
        }

        --paper-item: {
          color: var(--nuxeo-text-default);
          font-family: var(--nuxeo-app-font);
          font-size: 1rem;
        }

        --paper-input: {
          color: var(--nuxeo-text-default);
          font-family: var(--nuxeo-app-font);
        }

        --paper-input-container: {
          color: var(--nuxeo-text-default);
          font-family: var(--nuxeo-app-font);
        }

        --paper-input-container-label: {
          font-family: var(--nuxeo-app-font);
          font-size: 1.35rem;
        }

        --paper-input-container-input: {
          font-family: var(--nuxeo-app-font);
        }

        --paper-input-container-label-focus: {
          color: var(--nuxeo-text-default);
        }

        --paper-dialog: {
          color: var(--nuxeo-text-default);
          background: var(--nuxeo-box);
          font-family: var(--nuxeo-app-font);
        }

        --paper-checkbox-label: {
          font-family: var(--nuxeo-app-font);
        }

        --paper-button: {
          font-family: var(--nuxeo-app-font);
          font-weight: 600;
          font-size: 1rem;
          text-transform: capitalize;
          min-height: 40px;
          padding: 8px 16px;
          min-width: 96px;
          border-radius: 0.1em;
          margin: 0;
        }

        --nx-button-icon: {
          width: 16px;
          height: 16px;
        }

        --paper-button-ink-color: {
          color: var(--nuxeo-link-color);
        }

        --paper-button-flat-keyboard-focus: {
          background-color: var(--nuxeo-button-primary-focus);
          color: var(--nuxeo-button-primary-text);
          border-color: transparent;
        }

        --paper-button-raised-keyboard-focus: {
          background-color: var(--nuxeo-button-primary-focus);
          color: var(--nuxeo-button-primary-text);
          border-color: transparent;
        }

        --paper-transition-easing: {
          -webkit-transition: none;
          transition: none;
        }

        --paper-font-body1: {
          font-size: 1rem;
          line-height: 1.54rem;
        }

        /* Suggester (Quick search) */
        --nuxeo-suggester-button: {
          top: var(--nuxeo-app-top);
          right: 0;
          width: 60px;
          height: 53px;
          padding: 16px;
        }

        --nuxeo-suggester-bar: {
          position: relative;
          top: var(--nuxeo-app-top);
        }

        --nuxeo-suggester-width: 65%;

        --nuxeo-suggester-media-width: calc(100% - 90px);

        --nuxeo-suggester-media-margin-left: 1.2rem;

        --nuxeo-document-content-margin-bottom: 0;
        --nuxeo-document-trash-content-margin-bottom: 0;

        --nuxeo-results-view-height: calc(100vh - 130px - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));

        /* layout rules */
        --nuxeo-widget: {
          margin-bottom: 16px;
        }
      }

      @media (max-width: 1024px) {
        html {
          font-size: 14px;
          --nuxeo-document-create-popup-width: 90%;
          --nuxeo-document-form-popup-min-width: 90%;

          --nuxeo-dialog: {
            min-width: 0;
            width: 90%;
          }
        }
      }

      @media (max-width: 720px) {
        html {
          --nuxeo-browser-actions-menu-max-width: 160px;
          --nuxeo-results-selection-actions-menu-max-width: 160px;
          --nuxeo-document-blob-actions-menu-max-width: 80px;
        }
      }
    </style>
  </custom-style>
`;

document.head.appendChild(template.content);
