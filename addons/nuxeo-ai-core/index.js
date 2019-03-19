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
import { Debouncer } from '@polymer/polymer/lib/utils/debounce.js';
import { timeOut } from '@polymer/polymer/lib/utils/async.js';
import './elements/admin-ai-core.js';
import './elements/admin-ai-export.js';
import './elements/nuxeo-ai-suggestions.js';

import html from './nuxeo-ai-core.html';

const tmpl = document.createElement('template');
tmpl.innerHTML = html;
document.head.appendChild(tmpl.content);

const AISuggestionManager = (() => {
  const _map = new WeakMap(); // store field elements and suggestion widgets without preventing gc
  let _updateDebouncer = null;
  let op = null;

  function _getSuggestionWidget(element) {
    if (!_map.has(element)) {
      const suggestionWidget = document.createElement('nuxeo-ai-suggestions');
      suggestionWidget.style.marginBottom = '8px';
      element.parentNode.insertBefore(suggestionWidget, element.nextElementSibling);
      _map.set(element, suggestionWidget);
      return suggestionWidget;
    }
    return _map.get(element);
  }

  function _clearSuggestions(model) {
    Object.values(model).forEach((element) => {
      const suggestionWidget = _getSuggestionWidget(element);
      if (suggestionWidget) {
        suggestionWidget.suggestions = [];
      }
    });
  }

  function _getBoundElements(element, property) {
    const model = {};
    for (let i = 0; i < element.__templateInfo.nodeInfoList.length; i++) {
      const nodeInfo = element.__templateInfo.nodeInfoList[i];
      const node = element.__templateInfo.nodeList[i];
      const field = node.hasAttribute('field') && node.getAttribute('field');
      if (field && field.startsWith(property)) {
        model[field] = node;
      }
      nodeInfo.bindings.forEach((binding) => {
        if (binding.kind === 'property') {
          binding.parts.forEach((part) => {
            if (part.mode === '{' && !part.signature && part.source.startsWith(property)) {
              model[part.source] = model[part.source] || [];
              model[part.source] = node;
            }
          });
        }
      });
    }
    return model;
  }

  function _getSuggestions(doc) {
    if (!op) {
      op = document.createElement('nuxeo-operation');
      op.op = 'AI.Suggestion';
      op.headers = { 'X-Batch-No-Drop': 'true' };
      document.querySelector('nuxeo-app').appendChild(op);
    }
    op.input = doc;
    return op.execute();
  }

  return {
    /**
     * For a given layout:
     * 1) fetch suggestions for its document
     * 2) add a suggestion widget to each field that has suggestions (if no widget was added yet)
     * 3) update suggestions on suggestion widgets
     */
    updateWidgetSuggestions: (layout) => {
      if (!layout) {
        return;
      }
      _updateDebouncer = Debouncer.debounce(_updateDebouncer, timeOut.after(500), () => {
        const model = _getBoundElements(layout, 'document.properties');
        _getSuggestions(layout.document).then((response) => {
          /*
           * Inefficient approach that should be changed as soon as the response from server includes more information
           * (e.g. all output fields) to only clear the elements in need.
           * Ticket created to analyse and tackle this need: NXP-26314
           */
          _clearSuggestions(model);
          response.forEach((service) => {
            service.suggestions.forEach((suggestion) => {
              const element = model[`document.properties.${suggestion.property}`];
              const suggestionWidget = _getSuggestionWidget(element);
              if (!suggestionWidget.property) {
                // convert path to xpath
                suggestionWidget.property = suggestion.property;
              }
              suggestionWidget.suggestions = suggestion.values;
              suggestionWidget.document = layout.document;
              // set up binding
              suggestionWidget.addEventListener('document-changed', (evt) => {
                if ('path' in evt.detail && 'value' in evt.detail) {
                  layout.notifyPath(evt.detail.path);
                }
              });
            });
          });
        });
      });
    },
  };
})();

document.addEventListener('document-layout-changed', (e) => {
  if (e.detail.layout === 'metadata' || e.detail.layout === 'view') {
    return;
  }
  const layout = e.detail.element;
  layout._documentChanged = () => AISuggestionManager.updateWidgetSuggestions(layout);
  layout._createMethodObserver('_documentChanged(document.*)', true);
  AISuggestionManager.updateWidgetSuggestions(e.detail.element);
});
