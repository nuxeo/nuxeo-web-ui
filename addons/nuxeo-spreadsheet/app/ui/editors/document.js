/*
 *©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *     Nelson Silva <nsilva@nuxeo.com>
 */
import { Select2Editor } from './select2';
import { Query } from '../../nuxeo/rpc/query';

class DocumentEditor extends Select2Editor {
  prepare(row, col, prop, td, originalValue, cellProperties) {
    // flatten our values to a list of ids
    const value = Array.isArray(originalValue)
      ? originalValue.map((u) => this.getEntryId(u))
      : this.getEntryId(originalValue);
    super.prepare(row, col, prop, td, value, cellProperties);
  }

  query(connection, properties, term) {
    const q = new Query(connection);
    // Set the properties
    Object.assign(q.params, properties);
    q.params.searchTerm = term;
    q.pageProvider = (properties && properties.pageProviderName) || 'default_document_suggestion';
    q.page = 0;
    q.pageSize = 20;
    // Execute the query
    return q.run().then((result) => result.entries);
  }

  formatter(doc) {
    return doc.text || doc.title;
  }

  getEntryId(item) {
    return item && (item.uid || item.id);
  }

  // create documents again on save
  saveValue(val, ctrlDown) {
    let value = val[0][0];
    if (value) {
      value = value.split(',').map((uid) => {
        return {
          'entity-type': 'document',
          uid,
        };
      });
      // unwrap the map result if not muliple
      if (!this.cellProperties.multiple) {
        value = value[0];
      }
    } else {
      value = this.cellProperties.multiple ? [] : null;
    }

    super.saveValue([[value]], ctrlDown);
  }
}

function DocumentRenderer(instance, td, row, col, prop, value, cellProperties) {
  if (value) {
    if (!Array.isArray(value)) {
      value = [value];
    }
    arguments[5] = value.map((d) => d.uid).join(','); // jshint ignore:line
  }
  cellProperties.defaultRenderer.apply(this, arguments);
}

export { DocumentEditor, DocumentRenderer };
