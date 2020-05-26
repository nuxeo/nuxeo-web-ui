/*
 * (C) Copyright 2020 Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Contributors:
 *     Nelson Silva <nsilva@nuxeo.com>
 */
import 'handsontable/dist/handsontable.full.js';
import './lib/handsontable.patches.js';
import 'handsontable/dist/handsontable.full.css';
import 'select2/select2.js';
import 'select2/select2.css';
import './styles/styles.css';

import 'nuxeo/nuxeo.js';
import { parseParams, b64DecodeUnicode } from './utils';
import { Log } from './ui/log';
import { Spreadsheet } from './ui/spreadsheet';
import { i18n } from './ui/i18n';

// Extract the parameters (content view state and page provider)
const params = parseParams();
const { pp } = params;
// Parse the content view state
const cv = params.cv && JSON.parse(b64DecodeUnicode(params.cv));

// Our Spreadsheet instance
let sheet;

let log;

function setupUI() {
  log = new Log($('#console'));

  $('#close').click(() => {
    if (window.parent.jQuery && window.parent.jQuery.fancybox) {
      window.parent.jQuery.fancybox.close();
    }
  });
  $('#close').toggle(true);

  $('#save').click(() => {
    log.info(i18n('saving'));
    sheet.save().then((results) => {
      if (!results) {
        log.error(i18n('failedSave'));
        return;
      }
      let msg;
      if (results.length === 0) {
        msg = i18n('upToDate');
      } else {
        msg = `${results.length} ${i18n('rowsSaved')}`;
      }
      log.info(msg);
    });
  });

  $('input[name=autosave]').click(function() {
    sheet.autosave = $(this).is(':checked');
    if (sheet.autosave) {
      log.default(i18n('autoSave'));
    } else {
      log.default('');
    }
  });

  $(document).ajaxStart(() => $('#loading').show());
  $(document).ajaxStop(() => $('#loading').hide());
}

function doQuery() {
  return sheet.update().catch((err) => log.error(err.message));
}

function run(baseURL = '/nuxeo') {
  // Setup our connection
  const nx = new Nuxeo({ baseURL });
  nx.schemas(['*']);

  setupUI();

  return nx.connect().then(() => {
    // Setup the language
    const language = navigator.language || 'en';

    // Extract content view configuration
    let resultColumns = cv && cv.resultColumns;
    const pageProviderName = cv ? cv.pageProviderName : pp || 'spreadsheet_query';

    // default columns
    if (!resultColumns || resultColumns.length === 0) {
      resultColumns = [
        { label: 'Title', field: 'dc:title' },
        { label: 'Modified', field: 'dc:modified' },
        { label: 'Last Contributor', field: 'dc:lastContributor' },
        { label: 'State', field: 'currentLifeCycleState' },
      ];
    }

    // Setup the SpreadSheet
    sheet = new Spreadsheet(document.getElementById('grid'), nx, resultColumns, pageProviderName, language);

    // Add query parameters
    if (cv.queryParameters) {
      sheet.queryParameters = cv.queryParameters;
    }

    // Add the search document
    if (cv.searchDocument) {
      const namedParameters = {};
      for (const k in cv.searchDocument.properties) {
        const v = cv.searchDocument.properties[k];
        // skip empty values
        if (typeof v.length !== 'undefined' && v.length === 0) {
          continue;
        }
        namedParameters[k] = typeof v === 'string' ? v : JSON.stringify(v);
      }
      sheet.namedParameters = namedParameters;
    }

    // Add sort infos
    if (cv.sortInfos && cv.sortInfos.length > 0) {
      sheet.sortInfos = cv.sortInfos;
    }

    // Run the query
    return doQuery();
  });
}

run();
