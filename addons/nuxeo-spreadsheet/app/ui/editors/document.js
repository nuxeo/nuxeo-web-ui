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
    // cache multiple flag (same as directory/user)
    this._multiple = !!cellProperties.multiple;

    const value = Array.isArray(originalValue)
      ? originalValue.map((v) => this.prepareEntity(v))
      : this.prepareEntity(originalValue);

    super.prepare(row, col, prop, td, value, cellProperties);
  }

  prepareEntity(entity) {
    if (!entity) {
      return;
    }

    // normalize document uid
    const uid = entity.uid || entity.id || entity;

    // cache label for rendering
    this.cellLabels[uid] = this.cellLabels[uid] || entity.title || entity.text || uid;

    return uid;
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
    return doc.title || doc.text || doc.id;
  }

  onSelected(evt) {
    const data = evt?.params?.data;
    if (!data || !data.id) return;

    const uid = data.id;

    const label = data.title || data.text || uid;

    // never downgrade labels
    if (!this.cellLabels[uid]) {
      this.cellLabels[uid] = label;
    }
  }

  getValue() {
    let data = [];

    if (this.$textarea?.data('select2')) {
      data = this.$textarea.select2('data') || [];
    }

    const ids = data.map((d) => d.id).filter(Boolean);

    return this._multiple ? ids : ids[0] || '';
  }

  saveValue(_val, ctrlDown) {
    let data = [];

    // ✅ authoritative source (same fix as user.js)
    if (this.$textarea?.data('select2')) {
      data = this.$textarea.select2('data') || [];
    }

    const ids = data.map((d) => d.id).filter(Boolean);

    let value;

    if (!ids.length) {
      value = this._multiple ? [] : null;
    } else {
      const entries = ids.map((uid) => {
        return {
          'entity-type': 'document',
          uid,
        };
      });
      value = this._multiple ? entries : entries[0];
    }

    super.saveValue([[value]], ctrlDown);
  }

  get cellMeta() {
    return this.instance.getCellMeta(this.row, this.col);
  }

  get cellLabels() {
    return (this.cellMeta._labels = this.cellMeta._labels || {});
  }
}

function DocumentRenderer(instance, td, row, col, prop, value, cellProperties) {
  if (value) {
    if (!Array.isArray(value)) {
      value = [value];
    }

    const labels = instance.getCellMeta(row, col)._labels || {};

    arguments[5] = value
      .map((v) => {
        const uid = v.uid || v.id || v;
        return labels[uid] || uid;
      })
      .join(','); // jshint ignore:line
  }

  cellProperties.defaultRenderer.apply(this, arguments);
}

export { DocumentEditor, DocumentRenderer };
