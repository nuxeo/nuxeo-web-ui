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
import DefaultAISuggestionFormatter from './formatters/nuxeo-default-ai-suggestion-formatter.js';

const _formatters = {
  default: DefaultAISuggestionFormatter.is,
};

const AISuggestionFormatters = new (class {
  register(formatter, rules) {
    if (rules.type) {
      if (!_formatters.types) {
        _formatters.types = {};
      }
      _formatters.types[rules.type] = formatter;
    }
    if (rules.property) {
      if (!_formatters.properties) {
        _formatters.properties = {};
      }
      _formatters.properties[rules.property] = formatter;
    }
  }

  get(rules) {
    let formatter = null;
    if (_formatters.properties && rules.property) {
      formatter = _formatters.properties[rules.property];
    }
    if (!formatter && _formatters.types && rules.type) {
      formatter = _formatters.types[rules.type];
    }
    return formatter || _formatters.default;
  }
})();
Nuxeo.AISuggestionFormatters = AISuggestionFormatters;

export default AISuggestionFormatters;
