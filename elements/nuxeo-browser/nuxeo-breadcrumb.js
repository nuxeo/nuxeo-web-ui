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
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@nuxeo/nuxeo-elements/nuxeo-connection.js';
import '@polymer/iron-icon/iron-icon.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class';
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { microTask } from '@polymer/polymer/lib/utils/async.js';

{
  /**
  `nuxeo-breadcrumb`
  @group Nuxeo UI
  @element nuxeo-breadcrumb
  */
  class Breadcrumb extends mixinBehaviors([RoutingBehavior, I18nBehavior, IronResizableBehavior], Nuxeo.Element) {
    static get template() {
      return html`
        <style>
          :host {
            display: block;
            @apply --layout-flex;
            min-height: 3em;
            overflow: hidden;
            white-space: nowrap;
          }

          .breadcrumb {
            margin: 0.5em 1em 0 0;
            @apply --layout-horizontal;
          }

          .doc-path {
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
          }

          .current {
            font-weight: 400;
            display: block;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
            color: var(--nuxeo-app-header, #fff);
            text-decoration: none;
          }

          .current-icon iron-icon {
            width: 1.6rem;
            height: 1.5rem;
            margin: 0.3rem 0.5rem 0 0;
            background-color: rgba(255, 255, 255, 0.7);
            padding: 0.2em;
            border-radius: 2px;
          }

          #ancestors {
            max-width: 100%;
            list-style-type: none;
            margin: 0;
            margin-top: -3px;
            padding: 0;
            font-size: 0.75rem;
          }

          #ancestors li {
            max-width: 100%;
            display: inline-block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          #ancestors li + li::before {
            content: ' > ';
            white-space: pre;
            opacity: 0.5;
            font-weight: 300;
          }

          #ancestors a,
          #ellipsis {
            @apply --nuxeo-link;
            opacity: 0.5;
            font-weight: 400;
            letter-spacing: 0.02rem;
            text-decoration: none;
          }

          #ancestors a:hover {
            color: var(--nuxeo-link-hover-color, #0066ff);
            opacity: 1;
          }

          @media (max-width: 1024px) {
            .current-icon {
              display: none;
            }
          }
        </style>

        <nuxeo-connection id="nxcon" url="{{url}}"></nuxeo-connection>

        <div class="breadcrumb">
          <div class="current-icon" aria-hidden="true">
            <iron-icon src="[[_icon(document, url)]]"></iron-icon>
          </div>
          <div class="doc-path">
            <a
              href$="[[urlFor(document)]]"
              class="current breadcrumb-item breadcrumb-item-current"
              aria-current="page"
              title="[[_title(document)]]"
            >
              [[_title(document)]]
            </a>
            <nav aria-label="Breadcrumb">
              <ol id="ancestors"></ol>
            </nav>
          </div>
        </div>
      `;
    }

    static get is() {
      return 'nuxeo-breadcrumb';
    }

    static get properties() {
      return {
        document: {
          type: Object,
          observer: '_setBreadcrumbElements',
        },
      };
    }

    connectedCallback() {
      super.connectedCallback();
      this.addEventListener('iron-resize', this._resize);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener('iron-resize', this._resize);
    }

    get _ancestors() {
      return this.shadowRoot.getElementById('ancestors');
    }

    get _breadcrumbs() {
      const breadcrumbEntries =
        this.document &&
        this.document.contextParameters &&
        this.document.contextParameters.breadcrumb &&
        this.document.contextParameters.breadcrumb.entries;
      return breadcrumbEntries && breadcrumbEntries.slice(0, breadcrumbEntries.length - 1);
    }

    get _contentWidth() {
      return Array.from(this._ancestors.children).reduce((sum, current) => sum + current.offsetWidth, 0);
    }

    _setBreadcrumbElements() {
      const ancestors = this._ancestors;
      this.deletedNodes = [];
      if (ancestors && this._breadcrumbs) {
        ancestors.innerHTML = '';
        this._breadcrumbs.forEach((element) => {
          const listItem = document.createElement('li');

          const anchor = document.createElement('a');
          anchor.textContent = element.title;
          anchor.setAttribute('title', element.title);
          anchor.setAttribute('href', this.urlFor(element));

          listItem.appendChild(anchor);
          ancestors.appendChild(listItem);
        });
      }
      this._resize();
    }

    _resize() {
      this.__resizeDebouncer = Debouncer.debounce(this.__resizeDebouncer, microTask, () => {
        if (this.lastDeletedNodeWidth == null) {
          this.lastDeletedNodeWidth = 0;
        }
        // keep removing the first breadcrumb item if it doesn't fit in the container;
        // add ellipsis to the first child in order to show users the breadcrumb has been sliced
        while (this._contentWidth > this._ancestors.offsetWidth && this._ancestors.childNodes.length > 2) {
          const nodeToBeRemoved =
            this._ancestors.firstChild.textContent === '...'
              ? this._ancestors.childNodes[1]
              : this._ancestors.firstChild;
          this.deletedNodes.push(nodeToBeRemoved);
          this.lastDeletedNodeWidth = nodeToBeRemoved.offsetWidth;
          nodeToBeRemoved.remove();
          if (this.deletedNodes.length === 1) {
            const ellipsis = document.createElement('span');
            ellipsis.setAttribute('id', 'ellipsis');
            ellipsis.classList.add('breadcrumb-item');
            ellipsis.textContent = '...';

            const listItem = document.createElement('li');
            listItem.appendChild(ellipsis);
            this._ancestors.insertBefore(listItem, this._ancestors.firstChild);
          }
        }
        // if the container has space to accommodate the last deleted node, insert it
        // if there is no longer items removed, we will remove also the ellipsis
        while (
          this._contentWidth + this.lastDeletedNodeWidth < this._ancestors.offsetWidth &&
          this.deletedNodes.length > 0
        ) {
          this._ancestors.insertBefore(this.deletedNodes[this.deletedNodes.length - 1], this._ancestors.childNodes[1]);
          this.deletedNodes.pop();
          if (this.deletedNodes.length === 0) {
            const ellipsisListItem = this.shadowRoot.getElementById('ellipsis').parentElement;
            if (ellipsisListItem) {
              ellipsisListItem.remove();
            }
          }
        }
      });
    }

    _title(document) {
      if (document) {
        return document.type === 'Root' ? this.i18n('browse.root') : document.title;
      }
    }

    _icon(document, url) {
      if (document && document.properties && document.properties['common:icon']) {
        return url ? url + document.properties['common:icon'] : '';
      }
      return '';
    }
  }

  customElements.define('nuxeo-breadcrumb', Breadcrumb);
  Nuxeo.Breadcrumb = Breadcrumb;
}
