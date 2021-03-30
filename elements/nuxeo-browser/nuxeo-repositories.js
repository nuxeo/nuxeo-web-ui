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
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';
import '@nuxeo/nuxeo-elements/nuxeo-element.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import { RoutingBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-routing-behavior';

/**
`nuxeo-repositories`
@group Nuxeo UI
@element nuxeo-repositories
*/
class Repositories extends mixinBehaviors([I18nBehavior, RoutingBehavior], Nuxeo.Element) {
  static get template() {
    return html`
      <style include="nuxeo-styles">
        paper-listbox {
          --paper-listbox-background-color: transparent;
        }
      </style>
      <nuxeo-connection id="nx" on-connected="_updateSelected"></nuxeo-connection>
      <paper-menu-button>
        <paper-icon-button
          icon="icons:expand-more"
          slot="dropdown-trigger"
          aria-label$="[[i18n('command.expand')]]"
        ></paper-icon-button>
        <paper-listbox slot="dropdown-content" selected="[[_selected]]" attr-for-selected="name">
          <dom-repeat items="[[repositories]]" as="repo">
            <template>
              <paper-item name$="[[repo.name]]"><a href$="[[repo.href]]">[[i18n(repo.label)]]</a></paper-item>
            </template>
          </dom-repeat>
        </paper-listbox>
      </paper-menu-button>
    `;
  }

  static get is() {
    return 'nuxeo-repositories';
  }

  static get properties() {
    return {
      hidden: {
        type: Boolean,
        reflectToAttribute: true,
        computed: '_isHidden(repositories)',
      },
      repositories: {
        type: Array,
        value() {
          if (Nuxeo.UI.repositories) {
            return Nuxeo.UI.repositories.map((r) => Object.assign({}, r));
          }
          return [];
        },
      },
      _selected: String,
    };
  }

  _isHidden(repos) {
    return repos.length < 2;
  }

  _updateSelected() {
    let repo = this.$.nx.repositoryName;
    if (!repo) {
      const defaultRepo = this.repositories.find((r) => r.isDefault);
      if (defaultRepo) {
        repo = defaultRepo.name;
      }
    }
    this._selected = repo;
  }
}

customElements.define(Repositories.is, Repositories);
