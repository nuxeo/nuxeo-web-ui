/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

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

/**
 * Shared contract between the announcement banner (`nuxeo-announcement-banner`) and its
 * administration screen (`nuxeo-announcement-management`).
 *
 * The announcement is persisted as a single entry of the `webUIAnnouncement` directory, which is
 * readable by every authenticated user and writable by administrators only.
 */

/** Directory holding the announcement. */
export const ANNOUNCEMENT_DIRECTORY = 'webUIAnnouncement';

/** Id of the one and only entry of that directory. */
export const ANNOUNCEMENT_ENTRY_ID = 'announcement';

/** REST path (relative to the API root) used to read/create the announcement. */
export const ANNOUNCEMENT_ENTRY_PATH = `directory/${ANNOUNCEMENT_DIRECTORY}`;

/** REST path used to update the announcement. */
export const ANNOUNCEMENT_ENTRY_UPDATE_PATH = `${ANNOUNCEMENT_ENTRY_PATH}/${ANNOUNCEMENT_ENTRY_ID}`;

/** Event fired on `document` when an administrator saves the announcement. */
export const ANNOUNCEMENT_UPDATED_EVENT = 'announcement-updated';

/**
 * Maximum length of the free text fields. The directory columns are `VARCHAR(255)`, and the server
 * rejects longer values, so the administration screen enforces the same limit up front.
 */
export const ANNOUNCEMENT_MAX_LENGTH = 255;

/** Only plain web links may be rendered, never `javascript:` or `data:` URLs. */
const ALLOWED_LINK_PROTOCOLS = ['http:', 'https:'];

/**
 * Normalises an administrator supplied link and drops anything that is not a plain web link.
 *
 * @param {string} url the configured link.
 * @return {string} an absolute `http(s)` URL, or an empty string when there is nothing safe to link.
 */
export function sanitizeAnnouncementLink(url) {
  if (typeof url !== 'string') {
    return '';
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed, window.location.href);
    return ALLOWED_LINK_PROTOCOLS.includes(parsed.protocol) ? parsed.href : '';
  } catch (e) {
    return '';
  }
}
