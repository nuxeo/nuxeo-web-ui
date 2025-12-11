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
import { Operation } from '../../nuxeo/rpc/operation';

// label helper for user entries
function getUserLabel(entry) {
  // try common fields in order of preference
  if (entry.properties) {
    return entry.properties.displayName || entry.properties.fullName || entry.properties.label || entry.properties.id;
  }
  return entry.displayLabel || entry.text || entry.name || entry.id;
}

class UserEditor extends Select2Editor {
  prepare(row, col, prop, td, originalValue, cellProperties) {
    this._multiple = !!cellProperties?.multiple;

    const value = Array.isArray(originalValue)
      ? originalValue.map(this.prepareEntity.bind(this))
      : this.prepareEntity(originalValue);

    super.prepare(row, col, prop, td, value, cellProperties);
  }

  // Flatten user/group entities to prefixed ids and cache label
  prepareEntity(entity) {
    if (!entity) return;

    const prefixedId = this.getEntryId(entity);

    // If label not cached yet, derive a human label from the id
    if (prefixedId && !this.cellLabels[prefixedId]) {
      // "user:Administrator" -> "Administrator"
      if (typeof prefixedId === 'string' && prefixedId.includes(':')) {
        this.cellLabels[prefixedId] = prefixedId.split(':')[1];
      } else {
        this.cellLabels[prefixedId] = prefixedId;
      }
    }

    return prefixedId;
  }

  // create user/group objects again on save (robust)
  saveValue(_val, ctrlDown) {
    let data = [];

    if (this.$textarea?.data('select2')) {
      data = this.$textarea.select2('data') || [];
    }

    // Extract ids from Select2 data
    const ids = data.map((d) => d.id || d.prefixed_id).filter(Boolean);

    let value;

    if (!ids.length) {
      value = this._multiple ? [] : null;
    } else {
      const entries = ids.map((id) => {
        let type = 'user';

        if (id.startsWith('user:') || id.startsWith('group:')) {
          const [t, realId] = id.split(':');
          type = t;
          id = realId;
        }

        return {
          'entity-type': type,
          id,
        };
      });

      value = this._multiple ? entries : entries[0];
    }

    super.saveValue([[value]], ctrlDown);
  }

  // Build the prefixed id for an item (object or raw id)
  getEntryId(item) {
    if (!item) return item;
    if (item['entity-type']) {
      return `${item['entity-type']}:${item.id}`;
    }
    // prefer prefixed_id if present; otherwise use id
    return item.prefixed_id || item.id || item;
  }

  // Called by Select2 formatter / selection — cache labels here
  resultFormatter(entry) {
    // entry from server may already have id/displayLabel/text props
    const label = entry.displayLabel || entry.text || getUserLabel(entry);

    const prefixedId = entry['entity-type']
      ? `${entry['entity-type']}:${entry.id}`
      : entry.prefixed_id || entry.id || null;

    if (prefixedId) {
      this.cellLabels[prefixedId] = this.cellLabels[prefixedId] || label;
    }

    return entry.displayLabel;
  }

  // onSelected invoked by select2-editor when user selects item — ensure cache is filled
  onSelected(evt) {
    const data = evt.params?.data;
    if (!data) return;

    const prefixedId = data.prefixed_id || (data['entity-type'] ? `${data['entity-type']}:${data.id}` : data.id);

    if (!prefixedId) return;

    const fullLabel = data.displayLabel || data.text;
    if (!fullLabel) return;

    const existing = this.cellLabels[prefixedId];

    // Only overwrite if label is better (longer)
    if (!existing || fullLabel.length > existing.length) {
      this.cellLabels[prefixedId] = fullLabel;
    }
  }

  query(connection, properties, term) {
    const op = new Operation(connection, 'UserGroup.Suggestion');
    Object.assign(op.params, properties);
    op.params.searchTerm = term;
    if (this.widgetProperties.userSuggestionSearchType) {
      op.params.searchType = this.widgetProperties.userSuggestionSearchType;
    }
    return op.execute();
  }

  formatter(entry) {
    // also used by Select2 to render chosen items — ensure we return a string label
    const label = entry.text || entry.displayLabel || getUserLabel(entry);

    const prefixedId = entry['entity-type']
      ? `${entry['entity-type']}:${entry.id}`
      : entry.prefixed_id || entry.id || null;
    if (prefixedId) {
      this.cellLabels[prefixedId] = this.cellLabels[prefixedId] || label;
    }

    return label;
  }

  get widgetProperties() {
    return this.cellProperties.widget.properties.any || {};
  }

  get cellMeta() {
    return this.instance.getCellMeta(this.row, this.col);
  }

  get cellLabels() {
    return (this.cellMeta._labels = this.cellMeta._labels || {});
  }
}

// Renderer that uses cached labels
function UserRenderer(instance, td, row, col, prop, value, cellProperties) {
  if (value) {
    const labels = instance.getCellMeta(row, col)._labels || {};
    const items = Array.isArray(value) ? value : [value];

    arguments[5] = items
      .map((u) => {
        const key = u['entity-type'] ? `${u['entity-type']}:${u.id}` : u.id || u;
        return labels[key] || key.replace(/^.*:/, '');
      })
      .join(', ');
  }
  cellProperties.defaultRenderer.apply(this, arguments);
}

export { UserEditor, UserRenderer };
