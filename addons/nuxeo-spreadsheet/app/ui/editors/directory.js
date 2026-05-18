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
import { Directory } from '../../nuxeo/rpc/directory';

// l10n Label helpers
function getEntryLabel(entry, lang = 'en') {
  if (entry.properties) {
    let label = '';
    if (entry.properties.parent) {
      label = `${getEntryLabel(entry.properties.parent, lang)}/`;
    }
    label += entry.properties[`label_${lang}`] || entry.properties.label || entry.properties.id;
    return label;
  }
  return entry.text || entry;
}

class DirectoryEditor extends Select2Editor {
  // Let's override prepare and just pass set the select2 options ourselves
  prepare(row, col, prop, td, originalValue, cellProperties) {
    // setup the label cache
    this._labels = {};

    // flatten our values to a list of ids
    const value = Array.isArray(originalValue)
      ? originalValue.map(this.prepareEntity.bind(this))
      : this.prepareEntity(originalValue);

    super.prepare(row, col, prop, td, value, cellProperties);
  }

  // flatten entities to plain ids and cache the labels
  prepareEntity(entity) {
    if (!entity) {
      return;
    }

    // remember if we are handling directoryEntries or just strings
    this._isDirectoryEntry = entity['entity-type'] === 'directoryEntry';
    if (!this._isDirectoryEntry) {
      return entity;
    }

    let id;
    if (entity.properties.parent) {
      let parentId =
        typeof entity.properties.parent === 'object'
          ? entity.properties.parent.properties.id
          : entity.properties.parent;
      id = `${parentId}/${entity.properties.id}`;
    } else {
      // eslint-disable-next-line prefer-destructuring
      id = entity.properties.id;
    }
    this.cellLabels[id] = this.cellLabels[id] || getEntryLabel(entity, this.language);
    return id;
  }

  // create directory entries again on save
  saveValue(val, ctrlDown) {
    // Defensive logging — remove after you confirm behavior
    const incoming = val && val[0] && val[0][0];

    let value = incoming;

    // Normalize empty/falsey
    if (!value) {
      value = this.column.multiple ? [] : null;
      return super.saveValue([[value]], ctrlDown);
    }

    // If items already look like directoryEntry objects, just pass through (but preserve single/multi)
    const looksLikeDirectoryEntry = (item) =>
      item && (item['entity-type'] === 'directoryEntry' || !!item.directoryName || !!item.properties);

    if (this._isDirectoryEntry) {
      // Normalize value into array of ids first
      let ids;

      if (Array.isArray(value)) {
        // Could be array of strings or array of directoryEntry objects
        if (value.length && looksLikeDirectoryEntry(value[0])) {
          // Already directoryEntry objects — keep but ensure shape & unwrap for single
          const entries = value.map((e) => {
            return {
              'entity-type': 'directoryEntry',
              directoryName: this.directoryName,
              id: e.id || (e.properties && e.properties.id) || e.properties?.id,
              properties: { id: e.id || (e.properties && e.properties.id) || e.properties?.id },
            };
          });
          value = this.column.multiple ? entries : entries[0] || null;
          return super.saveValue([[value]], ctrlDown);
        }
        // Array of id strings (normal case)
        ids = value;
      } else if (typeof value === 'string') {
        // comma-separated string or single id
        ids = value.includes(',')
          ? value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [value];
      } else if (typeof value === 'object') {
        // Single directoryEntry-like object
        if (looksLikeDirectoryEntry(value)) {
          const entry = {
            'entity-type': 'directoryEntry',
            directoryName: this.directoryName,
            id: value.id || value.properties?.id,
            properties: { id: value.id || value.properties?.id },
          };
          value = this.column.multiple ? [entry] : entry;
          return super.saveValue([[value]], ctrlDown);
        }
        // unknown object shape — try to extract id
        const maybeId = value.id || value.properties?.id;
        if (maybeId) ids = [maybeId];
        else ids = [];
      } else {
        // fallback
        ids = [];
      }

      // Build directoryEntry objects from ids
      const entries = ids.map((id) => {
        return {
          'entity-type': 'directoryEntry',
          directoryName: this.directoryName,
          id,
          properties: { id },
        };
      });

      if (!this.column.multiple) {
        value = entries[0] || null;
      } else {
        value = entries;
      }
    }
    super.saveValue([[value]], ctrlDown);
  }

  getValue() {
    let data = [];

    if (this.$textarea?.data('select2')) {
      data = this.$textarea.select2('data') || [];
    }

    const ids = data.map((d) => d.computedId || d.id);

    return this.cellProperties.multiple ? ids : ids[0] || '';
  }

  query(connection, properties, term) {
    const directory = new Directory(connection); // Directory name is a widget property
    // Set the properties
    Object.assign(directory, properties);
    // Set the language
    directory.language = this.language || 'en';
    // Perform the search
    return directory.search(term);
  }

  // When a dbl10n entry is selected we'll cache the labels to be used
  // by our renderer
  onSelected(evt) {
    const data = evt.params?.data;
    if (!data) return;

    const id = data.computedId || data.id;
    if (!id) return;

    // Prefer full labels, never downgrade
    const existing = this.cellLabels[id];

    const fullLabel = data.absoluteLabel || data.displayLabel || data.text;

    // Only overwrite if:
    // - label does not exist yet, OR
    // - new label is more complete (contains '/')
    if (!existing || (fullLabel && fullLabel.includes('/') && !existing.includes('/'))) {
      this.cellLabels[id] = fullLabel;
    }
  }

  get cellMeta() {
    return this.instance.getCellMeta(this.row, this.col);
  }

  get cellLabels() {
    return (this.cellMeta._labels = this.cellMeta._labels || {});
  }

  get language() {
    return this.instance.getSettings().language || 'en';
  }

  get column() {
    return this.cellProperties;
  }

  get widget() {
    return this.column.widget;
  }

  get field() {
    return this.widget.field;
  }

  get directoryName() {
    return this.widget.properties.directoryName;
  }

  get isDbl10n() {
    return !!this.widget.properties.dbl10n;
  }

  get sourceData() {
    return this.instance.getSourceDataAtRow(this.row);
  }

  resultFormatter(entry) {
    return entry.displayLabel;
  }

  formatter(entry) {
    let label = this.cellLabels[entry.id] || entry.absoluteLabel;
    // This is used in initSelection and in this case we don't have 'displayLabel'
    if (!label && this.isDbl10n) {
      label = getEntryLabel(entry, this.language);
    }
    return label || entry.text;
  }

  getEntryId(item) {
    if (item.computedId) {
      return item.computedId;
    }
    return item.id;
  }
}

function DirectoryRenderer(instance, td, row, col, prop, value, cellProperties) {
  if (value) {
    const lang = instance.getSettings().language || 'en';
    if (!Array.isArray(value)) {
      value = typeof value === 'string' ? value.split(',') : [value];
    }
    const labels = instance.getCellMeta(row, col)._labels;
    arguments[5] = value
      .map((v) => {
        const key = v.computedId || v.properties?.id || v.id || v;
        return labels && labels[key] ? labels[key] : getEntryLabel(v, lang);
      })
      .join(','); // jshint ignore:line
  }
  cellProperties.defaultRenderer.apply(this, arguments);
}

export { DirectoryEditor, DirectoryRenderer };
