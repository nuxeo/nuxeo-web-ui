/**
@license
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
import '@polymer/polymer/polymer-legacy.js';

import '@polymer/paper-header-panel/paper-header-panel.js';
import '@polymer/paper-toolbar/paper-toolbar.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

/**
`nuxeo-page`
@group Nuxeo UI
@element nuxeo-page
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      .page {
        height: calc(100vh - (var(--nuxeo-app-top, 0) + var(--nuxeo-app-bottom, 0)));
        display: flex;
        flex-direction: column;
        /* NXENG-527: Rebranded hosts set a custom background; classic pages default to transparent. */
        background-color: var(--nuxeo-page-host-background, transparent);
      }

      #content {
        flex: 1 1 auto;
        position: relative;
        padding: var(--nuxeo-page-content-padding, 16px 16px 0 16px);
        overflow-y: auto;
        /* Content background: uses custom color for rebranded themes or transparent for classic. */
        background-color: var(--nuxeo-page-content-background, transparent);
        /* Apply border radius to content area for rebranded themes */
        border-radius: var(--nuxeo-page-content-border-radius, 0);
        margin: var(--nuxeo-page-content-margin, 0);

        /*
         * Reserve the strip covered by the floating document create button, published by nuxeo-app
         * as --nuxeo-page-content-safe-area-bottom and 0 wherever no button floats over this
         * region. padding-bottom extends the scrollable range so the last row can be scrolled
         * clear of the button instead of staying permanently underneath it, and
         * scroll-padding-bottom keeps anything scrolled into view - keyboard focus in particular -
         * out from under it. Both come after --nuxeo-page-content-padding so they win over the
         * bottom value of that shorthand, which is 0 in every theme that sets it.
         */
        padding-bottom: var(--nuxeo-page-content-safe-area-bottom, 0px);
        scroll-padding-bottom: var(--nuxeo-page-content-safe-area-bottom, 0px);
      }

      /*
       * WEBUI-2314: on a region that already shows all of its content, the reserved strip is the
       * only thing there is to scroll to, so the tab gets a scrollbar that reveals nothing but the
       * empty strip - the large blank space at the bottom of View, History and Trash. Reserving it
       * is worth that scrollbar only where the region scrolls past the strip on its own account,
       * which is the reflow case WEBUI-1320 was raised for; see _updateContentFit. Below that the
       * attribute hands the room back. scroll-padding-bottom stays either way: it costs no space
       * and is what keeps focus from landing under the button.
       */
      :host([content-fits]) #content {
        padding-bottom: 0;
      }

      .toolbar {
        flex: 0 0 auto;
        @apply --layout-horizontal;
        @apply --layout-center;
        height: var(--nuxeo-drawer-header-height);
        color: var(--nuxeo-app-header);
        background: var(--nuxeo-page-toolbar-background, var(--nuxeo-app-header-background));
        box-shadow: var(--nuxeo-page-toolbar-box-shadow, var(--nuxeo-app-header-box-shadow));
        overflow-x: auto;
      }

      :host([dir='rtl']) .toolbar {
        border-right: 1px solid var(--divider-color);
      }

      #tabs {
        flex: 0 0 auto;
        /* Use custom tabs styling if available, otherwise fall back to header styling */
        background: var(--nuxeo-page-tabs-background, var(--nuxeo-app-header-background));
        box-shadow: var(--nuxeo-page-tabs-box-shadow, var(--nuxeo-app-header-box-shadow));
        margin: var(--nuxeo-page-tabs-margin, 1px 0 0 0);
        overflow-x: auto;
        z-index: 1;
        border-radius: var(--nuxeo-page-tabs-border-radius, 0);
      }

      :host([dir='rtl']) #tabs {
        border-right: 1px solid var(--divider-color);
      }

      #header::slotted(*) {
        overflow-x: hidden;
      }

      #header::slotted(*), /* chrome, safari */
      #toolbar::slotted(*) {
        /* firefox */
        @apply --layout-horizontal;
        @apply --layout-center;
        width: 100%;
        padding-right: 64px;
        padding-left: 16px;
      }

      :host([dir="rtl"]) #header::slotted(*), /* Chrome, Safari */
      :host([dir="rtl"]) #toolbar::slotted(*) {
        padding-right: 16px;
        padding-left: 64px;
      }

      @media (max-width: 720px) {
        #header::slotted(*), /* chrome, safari */
        #toolbar::slotted(*) {
          /* firefox */
          overflow-y: scroll;
          padding-left: 48px;
        }

        :host([dir="rtl"]) #header::slotted(*), /* Chrome, Safari */
        :host([dir="rtl"]) #toolbar::slotted(*) {
          padding-right: 48px;
        }
      }
    </style>

    <div class="page">
      <div class="toolbar" id="toolbar">
        <slot id="header" slot="header" name="header"></slot>
      </div>
      <div id="tabs" role="navigation">
        <slot name="tabs"></slot>
      </div>
      <div id="content">
        <slot></slot>
      </div>
    </div>
  `,

  is: 'nuxeo-page',
  ready() {
    if (!this.hasAttribute('dir')) {
      const direction = document.documentElement.getAttribute('dir');
      this.setAttribute('dir', direction);
    }
  },

  attached() {
    this._slotted = [];
    this._contentObserver = new ResizeObserver(() => this._scheduleContentFit());
    this._contentObserver.observe(this.$.content);
    // The content region fills the page, so only what is slotted into it changes how much there is
    // to scroll. Rebind on slotchange because tabs swap their layout in and out.
    this._contentSlot = this.$.content.querySelector('slot');
    this._onSlotChange = () => this._observeSlotted();
    this._contentSlot.addEventListener('slotchange', this._onSlotChange);
    this._observeSlotted();
  },

  detached() {
    if (this._contentSlot) {
      this._contentSlot.removeEventListener('slotchange', this._onSlotChange);
    }
    if (this._contentObserver) {
      this._contentObserver.disconnect();
    }
    cancelAnimationFrame(this._contentFitFrame);
  },

  _observeSlotted() {
    this._slotted.forEach((element) => this._contentObserver.unobserve(element));
    this._slotted = this._contentSlot.assignedElements({ flatten: true });
    this._slotted.forEach((element) => this._contentObserver.observe(element));
    this._scheduleContentFit();
  },

  _scheduleContentFit() {
    cancelAnimationFrame(this._contentFitFrame);
    this._contentFitFrame = requestAnimationFrame(() => this._updateContentFit());
  },

  /**
   * Decide whether reserving the create button strip buys this region anything.
   *
   * It does when the region scrolls further than the strip itself: the content then genuinely runs
   * under the button, the reserve is the last stretch of a range the user is already using, and
   * without it the end stays unreachable - the 400% zoom reflow case WEBUI-1320 was raised for.
   * Below that the reserve would be most of the scroll range and all of it empty, which is the
   * blank strip WEBUI-2314 reports, so the region keeps the space instead.
   *
   * Taking off the padding currently in force recovers how far the content reaches in either
   * state, so the answer never depends on the attribute it is about to set, and the regions inside
   * size themselves from the viewport rather than from this box, so toggling it cannot change what
   * was just measured. One pass settles. scroll-padding-bottom is read for the strip's own height
   * because it carries the same value and is applied whichever way this goes.
   */
  _updateContentFit() {
    const content = this.$.content;
    const style = getComputedStyle(content);
    const reserve = Number.parseFloat(style.scrollPaddingBottom) || 0;
    const applied = Number.parseFloat(style.paddingBottom) || 0;
    const overflow = content.scrollHeight - applied - content.clientHeight;
    if (overflow > reserve) {
      this.removeAttribute('content-fits');
    } else {
      this.setAttribute('content-fits', '');
    }
  },
});
