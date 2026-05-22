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
 * Shared utility for invoking nxdrive:// protocol URLs.
 *
 * Browsers provide no reliable API to check if a custom protocol handler is registered.
 * Rather than relying on fragile blur/focus timing heuristics, the UI follows the
 * "Teams launcher" pattern: it always presents the user with explicit choices
 * ("Open with Nuxeo Drive" / "Download Nuxeo Drive"), and the user decides.
 *
 * This module only provides the browser-safe navigation helper for triggering
 * nxdrive:// URLs.
 */

// Delay (ms) before removing the hidden <object> element on Safari.
// Must be long enough for the OS to initiate the protocol handoff.
const SAFARI_OBJECT_CLEANUP_MS = 350;

/**
 * Navigates to a custom protocol URL (nxdrive://) to trigger the OS protocol handoff.
 *
 * On Safari, both anchor `.click()` and `window.location.href` go through WebKit's main frame
 * loader, which fires a synchronous "address is invalid" system alert when the protocol is not
 * registered. Using a hidden `<object>` element avoids this: WebKit treats object/embed src
 * loading as a passive resource fetch rather than a frame navigation, so an unregistered protocol
 * silently no-ops with no alert. When Drive IS installed the OS still intercepts the load and
 * triggers the expected window blur.
 *
 * On Chrome/Edge/Firefox the original anchor-click approach is kept: those browsers do not show
 * an alert for unknown custom schemes on anchor clicks, and assigning an unknown scheme to
 * window.location.href can cause Chrome to render an ERR_UNKNOWN_URL_SCHEME error page.
 */
export function navigateTo(url) {
  // Feature detection is not possible here — UA sniffing is the only option. // NOSONAR
  // Matches Safari but not Chrome/Edge (which include "Chrome" or "CriOS" in their UA string).
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent); // NOSONAR
  if (isSafari) {
    const obj = document.createElement('object');
    obj.data = url;
    obj.style.cssText = 'display:none;position:absolute;left:-9999px;width:1px;height:1px;';
    obj.setAttribute('aria-hidden', 'true');
    document.body.appendChild(obj);
    // Keep the element alive long enough for the OS to initiate the protocol handoff,
    // then remove it.
    setTimeout(() => obj.remove(), SAFARI_OBJECT_CLEANUP_MS);
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.style.cssText = 'display:none;position:absolute;left:-9999px;';
  a.setAttribute('aria-hidden', 'true');
  a.setAttribute('tabindex', '-1');
  document.body.appendChild(a);
  a.click();
  a.remove();
}
