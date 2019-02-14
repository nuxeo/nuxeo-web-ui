import '@polymer/polymer/polymer-legacy.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="nuxeo-styles">
  <template>
    <style include="iron-positioning">
      /* headings */
      h1, h2, h3, h4, h5, h6 {
        font-weight: 400;
      }

      h3 {
        font-size: 1rem;
        font-weight: 700;
        margin: 0 0 1em;
        text-transform: uppercase;
        letter-spacing: .04em;
      }

      /* links */
      a, a:active, a:visited, a:focus {
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
        opacity: .6;
      }

      paper-input[readonly] .input-content.label-is-highlighted label {
        color: var(--nuxeo-text-default);
        opacity: .6;
      }

      paper-input[readonly] .unfocused-line,
      paper-input[readonly] .focused-line {
        border-bottom: 1px dashed var(--nuxeo-text-default);
      }

      /* paper-button */
      paper-button {
        min-width: 96px;
      }
      paper-button:hover {
        @apply --nx-button-hover;
      }
      paper-button.primary {
        @apply --nx-button-primary;
        border-color: transparent;
      }
      paper-button.primary:hover,
      paper-button.primary:focus {
        @apply --nx-button-primary-hover;
        border-color: transparent;
      }
      paper-button[disabled] {
        @apply --nx-button-disabled;
      }
      paper-button + paper-button {
        margin-left: 8px;
      }

      paper-textarea {
        word-wrap: break-word;  /* legacy property */
        overflow-wrap: break-word;  /* css3 standard property */
        word-break: break-word;

        /* Hyphenize words */
        -webkit-hyphens: auto;
        -moz-hyphens: auto;
        -ms-hyphens: auto;
        -o-hyphens: auto;
        hyphens: auto;
      }

      /* */
      .header {
        @apply --layout-horizontal;
        @apply --layout-center;
        font-size: 1rem;
        height: 53px;
        padding: 0 16px;
        text-transform: uppercase;
        text-overflow: ellipsis;
        color: var(--nuxeo-drawer-header);
      }
    </style>
  </template>
</dom-module><custom-style>

<style include="nuxeo-styles">

  /* open-sans-300 - greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext */
  @font-face {
    font-family: 'Open Sans';
    font-style: normal;
    font-weight: 300;
    src: local('Open Sans Light'), local('OpenSans-Light')
        url('../fonts/open-sans-v15-greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext-300.woff2') format('woff2')
  }
  /* open-sans-300italic - greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext */
  @font-face {
    font-family: 'Open Sans';
    font-style: italic;
    font-weight: 300;
    src: local('Open Sans Light Italic'), local('OpenSans-LightItalic'),
        url('../fonts/open-sans-v15-greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext-300italic.woff2') format('woff2')
  }
  /* open-sans-regular - greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext */
  @font-face {
    font-family: 'Open Sans';
    font-style: normal;
    font-weight: 400;
    src: local('Open Sans Regular'), local('OpenSans-Regular'),
        url('../fonts/open-sans-v15-greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext-regular.woff2') format('woff2')
  }
  /* open-sans-italic - greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext */
  @font-face {
    font-family: 'Open Sans';
    font-style: italic;
    font-weight: 400;
    src: local('Open Sans Italic'), local('OpenSans-Italic'),
        url('../fonts/open-sans-v15-greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext-italic.woff2') format('woff2')
  }
  /* open-sans-600 - greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext */
  @font-face {
    font-family: 'Open Sans';
    font-style: normal;
    font-weight: 600;
    src: local('Open Sans SemiBold'), local('OpenSans-SemiBold'),
        url('../fonts/open-sans-v15-greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext-600.woff2') format('woff2')
  }
  /* open-sans-600italic - greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext */
  @font-face {
    font-family: 'Open Sans';
    font-style: italic;
    font-weight: 600;
    src: local('Open Sans SemiBold Italic'), local('OpenSans-SemiBoldItalic'),
        url('../fonts/open-sans-v15-greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext-600italic.woff2') format('woff2')
  }
  /* open-sans-700 - greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext */
  @font-face {
    font-family: 'Open Sans';
    font-style: normal;
    font-weight: 700;
    src: local('Open Sans Bold'), local('OpenSans-Bold'),
        url('../fonts/open-sans-v15-greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext-700.woff2') format('woff2')
  }
  /* open-sans-700italic - greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext */
  @font-face {
    font-family: 'Open Sans';
    font-style: italic;
    font-weight: 700;
    src: local('Open Sans Bold Italic'), local('OpenSans-BoldItalic'),
        url('../fonts/open-sans-v15-greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext-700italic.woff2') format('woff2')
  }
  /* open-sans-800 - greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext */
  @font-face {
    font-family: 'Open Sans';
    font-style: normal;
    font-weight: 800;
    src: local('Open Sans ExtraBold'), local('OpenSans-ExtraBold'),
        url('../fonts/open-sans-v15-greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext-800.woff2') format('woff2')
  }
  /* open-sans-800italic - greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext */
  @font-face {
    font-family: 'Open Sans';
    font-style: italic;
    font-weight: 800;
    src: local('Open Sans ExtraBold Italic'), local('OpenSans-ExtraBoldItalic'),
        url('../fonts/open-sans-v15-greek-ext_cyrillic-ext_cyrillic_greek_vietnamese_latin_latin-ext-800italic.woff2') format('woff2')
  }

  html {
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    font-size: 13px;
    line-height: 20px;
  }

  html, body {
    margin: 0;
    min-height: 100%;
    color: var(--nuxeo-text-default);
    font-family: var(--nuxeo-app-font);
    font-weight: 400;
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
    --nuxeo-app-header-box-shadow: 1px 0 0 rgba(0, 0, 0, 0.1) inset, 0 3px 5px rgba(0,0,0,0.1);

    --nuxeo-link: {
      color: var(--nuxeo-link-color);
      text-decoration: none;
    };

    --nuxeo-link-hover: {
      color: var(--nuxeo-link-hover-color);
      cursor: pointer;
    };

    --nuxeo-sidebar: {
      background-color: var(--nuxeo-sidebar-background);
    };

    --nuxeo-sidebar-item-theme: {
      border-bottom: 1px solid var(--nuxeo-border);
      color: var(--nuxeo-drawer-text);
      display: block;
      margin: 0;
      white-space: nowrap;
    };

    --nuxeo-sidebar-item-link: {
      color: var(--nuxeo-drawer-text);
      display: block;
      padding: 1.3em;
    };

    --nuxeo-action: {
      border: 1px solid transparent;
      border-radius: 5em;
    };

    --nuxeo-action-hover: {
       border: 1px solid var(--nuxeo-primary-color);
       color: var(--nuxeo-text-default);
    };

    --nuxeo-block-hover: {
      background-color: var(--nuxeo-container-hover);
    };

    --nuxeo-block-selected: {
      background-color: var(--nuxeo-box);
      outline: 0;
      box-shadow: 5px 0 0 0 var(--nuxeo-primary-color) inset;
    };

    --nuxeo-card-margin-bottom: 16px;

    --nuxeo-card: {
      display: block;
      padding: 16px;
      margin-bottom: var(--nuxeo-card-margin-bottom, 16px);
      box-shadow: 0 3px 5px rgba(0,0,0,0.04) !important;
      font-family: var(--nuxeo-app-font);
      border-radius: 0;
      background-color: var(--nuxeo-box) !important;
    };

    --nuxeo-label: {
      display: block;
      opacity: .6;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 400 !important;
      letter-spacing: 0.005em !important;
    };

    --nuxeo-tag: {
      display: inline-block;
      background-color: var(--nuxeo-tag-background);
      padding: .2rem .5rem;
      color: var(--nuxeo-tag-text);
      font-size: .8rem;
      letter-spacing: 0.02em;
      line-height: 1rem;
      margin-bottom: .3em;
      border-radius: 2em;
      text-decoration: none;
      vertical-align: baseline;
    };

    --nuxeo-user: {
      border-radius: 2.5em;
      text-transform: capitalize;
    };

    --nuxeo-dialog: {
      min-width: 480px;
    };

    --nuxeo-selectivity-label: {
      @apply --nuxeo-label;
    };

    --nx-actions: {
      display: flex;
      margin: 1em 0;
    };

    --nx-actions-button: {
      flex: 1;
    };

    --nuxeo-browser-actions-menu-max-width: 240px;

    --nuxeo-results-selection-actions-menu-max-width: 240px;

    --nuxeo-document-blob-actions-menu-max-width: 160px;

    --nuxeo-action-button-label: {
      padding-right: 8px;
    };

    --nuxeo-actions-menu-dropdown: {
      padding: 0 8px;
    };

    --nx-button-hover: {
      color: var(--nuxeo-link-hover-color);
    };

    --nx-button-primary: {
      color: var(--nuxeo-button-primary-text);
      font-weight: 700;
      background-color: var(--nuxeo-button-primary);
    };

    --nx-button-primary-hover: {
      color: var(--nuxeo-button-primary-text);
      background-color: var(--nuxeo-button-primary-focus);
    };

    --nx-button-disabled: {
      color: var(--nuxeo-button-disabled-text);
      font-weight: normal;
      background-color: var(--nuxeo-button-disabled);
    };

    --buttons-bar: {
      background-color: var(--nuxeo-dialog-buttons-bar);
      padding: .7em 1.8em;
    };

    --iron-data-table: {
      font-family: var(--nuxeo-app-font);
    };

    --paper-tooltip: {
      font-size: 1rem;
      font-family: var(--nuxeo-app-font);
      background-color: var(--nuxeo-sidebar-background);
    };

    --paper-card: {
      display: block;
      padding: 16px;
      margin-bottom: var(--nuxeo-card-margin-bottom, 16px);
      box-shadow: 0 3px 5px rgba(0,0,0,0.04) !important;
      font-family: var(--nuxeo-app-font);
      border-radius: 0;
      background-color: var(--nuxeo-box) !important;
    };

    --paper-card-header-text: {
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 1em;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: var(--nuxeo-text-default);
    };

    --paper-radio-button: {
      font-family: var(--nuxeo-app-font);
    };

    --paper-font-common-base: {
      font-family: var(--nuxeo-app-font);
    };

    --paper-tabs: {
      border-bottom: 1px solid var(--nuxeo-border);
    };

    --paper-icon-item: {
      color: var(--nuxeo-text-default);
      font-family: var(--nuxeo-app-font);
    };

    --paper-tab: {
      color: var(--nuxeo-text-default);
      font-family: var(--nuxeo-app-font);
    };

    --paper-item: {
      color: var(--nuxeo-text-default);
      font-family: var(--nuxeo-app-font);
      font-size: 1rem;
    };

    --paper-input: {
      color: var(--nuxeo-text-default);
      font-family: var(--nuxeo-app-font);
    };

    --paper-input-container: {
      color: var(--nuxeo-text-default);
      font-family: var(--nuxeo-app-font);
    };

    --paper-input-container-label: {
      font-family: var(--nuxeo-app-font);
      font-size: 1.35rem;
    };

    --paper-input-container-input: {
      font-family: var(--nuxeo-app-font);
    };

    --paper-input-container-label-focus: {
      color: var(--nuxeo-text-default);
    };

    --paper-dialog: {
      color: var(--nuxeo-text-default);
      background: var(--nuxeo-box);
      font-family: var(--nuxeo-app-font);
    };

    --paper-checkbox-label: {
      font-family: var(--nuxeo-app-font);
    };

    --paper-button: {
      font-family: var(--nuxeo-app-font);
      font-size: .8rem;
      color: var(--nuxeo-link-color);
      background-color: var(--nuxeo-button);
      border: 1px solid var(--nuxeo-border);
      border-radius: .1em;
      padding: .8em 2em;
      margin: 0;
    };

    --paper-button-ink-color: {
      color: var(--nuxeo-link-color);
    };

    --paper-button-flat-keyboard-focus: {
      background-color: var(--nuxeo-button-primary-focus);
      color: var(--nuxeo-button-primary-text);
      border-color: transparent;
    };

    --paper-button-raised-keyboard-focus: {
      background-color: var(--nuxeo-button-primary-focus);
      color: var(--nuxeo-button-primary-text);
      border-color: transparent;
    };

    --paper-transition-easing: {
      -webkit-transition: none;
      transition: none;
    };

    /* Suggester (Quick search) */
    --nuxeo-suggester-button: {
      top: var(--nuxeo-app-top);
      right: 0;
      width: 60px;
      height: 53px;
      padding: 16px;
    };

    --nuxeo-suggester-bar: {
      position: relative;
      top: var(--nuxeo-app-top);
    };

    --nuxeo-suggester-width: 65%;

    --nuxeo-suggester-media-width: calc(100% - 90px);

    --nuxeo-suggester-media-margin-left: 1.2rem;
  }

  @media (max-width: 1024px) {
	  html {
      font-size: 14px;

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
</custom-style>`;

document.head.appendChild($_documentContainer.content);

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
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
;
