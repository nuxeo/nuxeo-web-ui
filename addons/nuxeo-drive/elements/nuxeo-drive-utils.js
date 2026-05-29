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
 * Navigates to the given nxdrive:// URL and opens the install-help dialog.
 *
 * This follows the "navigate-first" pattern (like Zoom/Slack/Spotify):
 * - The browser fires the custom protocol immediately; if Drive is installed
 *   the OS shows a native "Open app?" prompt on top of the dialog.
 * - The dialog stays visible behind the prompt with a subtle install hint,
 *   so if Drive is *not* installed the user can expand the install links.
 * - If Drive opened successfully the user simply closes the dialog.
 *
 * No detection hacks, timeouts, or environment-specific code.
 *
 * @param {Object} element  - The Polymer element instance (must expose $.dialog).
 * @param {string} driveUrl - The nxdrive:// URL to navigate to.
 */
export function navigateAndShowFallback(element, driveUrl) {
  // Navigate immediately — the browser / OS handles the custom protocol prompt.
  globalThis.location.href = driveUrl;

  // Open the install-help dialog behind the browser's native prompt.
  if (!element.$.dialog.opened) {
    element.$.dialog.toggle();
  }
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
