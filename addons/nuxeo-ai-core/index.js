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
import './elements/admin-ai-advanced-export.js';
import './elements/nuxeo-ai-suggestions.js';
import './elements/nuxeo-ai-export-progress.js';
import './elements/actions/nuxeo-ai-bulk-add.js';
import './elements/actions/nuxeo-ai-bulk-remove.js';
import AISuggestionFormatters from './elements/nuxeo-ai-suggestion-formatters.js';
import DocumentAISuggestionFormatter from './elements/formatters/nuxeo-document-ai-suggestion-formatter.js';
import DirectoryAISuggestionFormatter from './elements/formatters/nuxeo-directory-ai-suggestion-formatter.js';
import UserGroupAISuggestionFormatter from './elements/formatters/nuxeo-user-group-ai-suggestion-formatter.js';

import html from './nuxeo-ai-core.html';

const tmpl = document.createElement('template');
tmpl.innerHTML = html;
document.head.appendChild(tmpl.content);

AISuggestionFormatters.register(DocumentAISuggestionFormatter.is, { type: 'document' });
AISuggestionFormatters.register(DirectoryAISuggestionFormatter.is, { type: 'directoryEntry' });
AISuggestionFormatters.register(UserGroupAISuggestionFormatter.is, { type: 'user' });
AISuggestionFormatters.register(UserGroupAISuggestionFormatter.is, { type: 'group' });

const AISuggestionManager = (() => {
  const _map = new WeakMap(); // store field elements and suggestion widgets without preventing gc
  let _updateDebouncer = null;
  let op = null;

  function _getSuggestionWidget(element, createIfNotExists = true) {
    if (!_map.has(element) && createIfNotExists) {
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
      const suggestionWidget = _getSuggestionWidget(element, false);
      if (suggestionWidget) {
        suggestionWidget.suggestions = [];
      }
    });
  }

  function _getSuggestions(doc) {
    if (!op) {
      op = document.createElement('nuxeo-operation');
      op.op = 'AI.Suggestion';
      op.headers = { 'X-Batch-No-Drop': 'true' };
      document.querySelector('nuxeo-app').appendChild(op);
    }
    op.input = doc;
    op.params = {
      references: true,
      updatedDocument: doc,
    };
    return op.execute();
  }

  return {
    /**
     * For a given layout:
     * 1) fetch suggestions for its document
     * 2) add a suggestion widget to each field that has suggestions (if no widget was added yet)
     * 3) update suggestions on suggestion widgets
     */
    updateWidgetSuggestions: (layout, path) => {
      if (!layout || !layout.document) {
        return;
      }
      const aiModels = layout.document.contextParameters && layout.document.contextParameters.aiModels;
      const isModelInput = path && aiModels && aiModels.inputs.includes(path.replace('document.properties.', ''));
      const noPropertyChanged = !path || 'document.properties'.startsWith(path);

      const model = layout._getBoundElements('document.properties');
      const widget = _getSuggestionWidget(path && model[path], false);
      if (widget && Array.isArray(widget.suggestions) && widget.suggestions.length > 0) {
        widget._matchInput();
      }
      if (noPropertyChanged || isModelInput) {
        _updateDebouncer = Debouncer.debounce(_updateDebouncer, timeOut.after(500), () => {
          _getSuggestions(layout.document).then((response) => {
            _clearSuggestions(model);
            response.forEach((service) => {
              service.suggestions.forEach((suggestion) => {
                const element = model[`document.properties.${suggestion.property}`];
                if (element) {
                  const suggestionWidget = _getSuggestionWidget(element);
                  if (!suggestionWidget.property) {
                    // convert path to xpath
                    suggestionWidget.property = suggestion.property;
                  }
                  suggestionWidget.suggestions = suggestion.values;
                  suggestionWidget.document = layout.document;
                  // set up binding
                  if (!suggestionWidget._notifyDocumentChanges) {
                    suggestionWidget._notifyDocumentChanges = (evt) => {
                      if ('path' in evt.detail && 'value' in evt.detail) {
                        layout.notifyPath(evt.detail.path);
                      }
                    };
                    suggestionWidget.addEventListener('document-changed', suggestionWidget._notifyDocumentChanges);
                  }
                }
              });
            });
          });
        });
      }
    },
  };
})();

document.addEventListener('document-layout-changed', (e) => {
  if (e.detail.layout === 'metadata' || e.detail.layout === 'view') {
    return;
  }
  const layout = e.detail.element;
  if (!layout) {
    return;
  }
  customElements.whenDefined(layout.tagName.toLowerCase()).then(() => {
    layout.__aiDocumentChanged = (event) => AISuggestionManager.updateWidgetSuggestions(layout, event.path);
    layout.constructor.createMethodObserver('__aiDocumentChanged(document.*)', true);
    AISuggestionManager.updateWidgetSuggestions(e.detail.element);
  });
});
