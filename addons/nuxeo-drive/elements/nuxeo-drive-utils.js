/**
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
 * Shared utilities for nuxeo-drive action buttons.
 *
 * Centralises the token-fetch / dialog-toggle sequence and the URL-safe Base64
 * encoder that are otherwise duplicated across nuxeo-drive-edit-button,
 * nuxeo-drive-download-button, and nuxeo-drive-upload-button.
 */

/**
 * Resets drive state, fetches the current Drive token list from the server,
 * updates `element._hasToken` / `element._installExpanded` accordingly, and
 * toggles the install dialog open.
 *
 * @param {Object} element - The Polymer element instance (must expose $.token and $.dialog).
 */
export function fetchTokenAndToggleDialog(element) {
  element._hasToken = false;
  element._installExpanded = false;
  element._opened = false;
  element.$.token
    .get()
    .then((response) => {
      const tokens = response.entries.map((token) => token.id);
      if (tokens?.length) {
        element._hasToken = true;
      } else {
        element._installExpanded = true;
      }
    })
    .catch(() => {
      element._installExpanded = true;
    });
  element.$.dialog.toggle();
}

/**
 * Encodes a Uint8Array as a URL-safe Base64 string (no padding).
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function base64UrlSafeEncode(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCodePoint(byte);
  });
  const b64 = btoa(binary).replaceAll('+', '-').replaceAll('/', '_');
  const padStart = b64.indexOf('=');
  return padStart === -1 ? b64 : b64.slice(0, padStart);
}
