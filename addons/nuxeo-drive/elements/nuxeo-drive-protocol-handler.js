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
 * Shared utility for invoking nxdrive:// protocol URLs and detecting whether Nuxeo Drive is installed on the client.
 *
 * Browsers provide no direct API to check if a custom protocol handler is registered. This module
 * infers it from window focus/blur timing after triggering the URL, and shows an install dialog
 * when Drive is determined to be absent.
 */

// How long (ms) to wait for window.blur before concluding Drive is not installed.
// Must be long enough for Drive's OS handoff blur to arrive (~50ms on macOS), but short
// enough to feel instant when Drive is absent.
// Note: on Safari the <object> path never fires blur when Drive is absent, so this
// is the sole detection delay on Safari — keep it as low as the OS handoff allows.
export const DRIVE_OPEN_TIMEOUT_MS = 150;

// How long (ms) the window must stay blurred to be treated as Drive having opened.
// Must exceed the blur→focus round-trip of a Chrome/Edge OS launch dialog (~40ms).
export const BLUR_DEBOUNCE_MS = 60;

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
    // then remove it. The blur/focus timing logic in openDriveUrl runs independently.
    setTimeout(() => obj.remove(), DRIVE_OPEN_TIMEOUT_MS + 200);
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

/**
 * Invokes a nxdrive:// URL and calls `toggle` to show/hide an install dialog if Drive is not detected.
 *
 * Strategy: browsers give no API to know if a protocol handler is installed, so we infer it from timing:
 *  - No blur within timeoutMs      → Drive absent (Firefox never blurs when no handler is registered)
 *  - Blur, then quick focus return → OS "no handler" dialog was dismissed → Drive absent
 *  - Blur, then slow focus return  → user came back from Drive → Drive is installed
 *
 * @param {string} url - The nxdrive:// URL to invoke.
 * @param {Function} toggle - Callback that opens or closes the install dialog.
 * @param {number} [timeoutMs=DRIVE_OPEN_TIMEOUT_MS] - Max ms to wait for a blur before concluding Drive is absent.
 * @param {number} [debounceMs=BLUR_DEBOUNCE_MS] - Min ms the window must stay blurred to count as Drive having opened.
 */
export function openDriveUrl(url, toggle, timeoutMs = DRIVE_OPEN_TIMEOUT_MS, debounceMs = BLUR_DEBOUNCE_MS) {
  let appOpened = false; // true once blur confirms Drive (or an OS dialog) handled the URL
  let dialogShown = false; // tracks whether the install dialog is currently open
  let debounceTimer = null; // waits out the blur to confirm Drive actually opened
  let primaryTimer = null; // fires if no blur occurs — Drive absent (Firefox path)
  let hardCapTimer = null; // absolute cleanup deadline — removes listeners if the user never refocuses
  let debounceSettledAt = null; // timestamp when the blur debounce settled, used to measure focus return speed

  // Feature detection is not possible for custom protocol handlers — UA sniffing is the only option here.
  // Firefox never fires blur when no protocol handler is registered, so the
  // onFocusAfterOpened check would never run anyway — skip it to avoid a false
  // "Drive absent" trigger when the user returns after Drive did open.
  const isFirefox = /firefox|fxios/i.test(navigator.userAgent); // NOSONAR

  const show = () => {
    if (!dialogShown) {
      dialogShown = true;
      toggle();
    }
  };

  const hide = () => {
    if (dialogShown) {
      dialogShown = false;
      toggle();
    }
  };

  const cleanup = () => {
    clearTimeout(debounceTimer);
    clearTimeout(primaryTimer);
    clearTimeout(hardCapTimer);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('focus', onFocusAfterOpened);
  };

  // Chrome/Edge/Safari only: quick focus return → OS "no handler" dialog dismissed → Drive absent.
  // Slow return → user came back from Drive → Drive is installed, dismiss if shown.
  const onFocusAfterOpened = () => {
    const elapsed = Date.now() - debounceSettledAt;
    elapsed < timeoutMs ? show() : hide();
    cleanup();
  };

  // Focus returned quickly during blur debounce → Drive opened as a background app, not via OS dialog.
  const onFocus = () => {
    appOpened = true;
    cleanup();
  };

  const onBlur = () => {
    clearTimeout(debounceTimer); // cancel any previous debounce before starting a new one
    debounceTimer = setTimeout(() => {
      appOpened = true;
      debounceSettledAt = Date.now();
      window.removeEventListener('focus', onFocus);

      if (!isFirefox) {
        // Firefox omitted: it never blurs on missing handler, so this listener would
        // fire only when the user manually returns — causing a false "Drive absent" show.
        window.addEventListener('focus', onFocusAfterOpened, { once: true });
      }

      if (dialogShown) {
        // Primary timeout fired before blur: blur confirms Drive or OS dialog was involved → dismiss.
        // Keep onFocusAfterOpened registered so quick vs slow focus return is still evaluated.
        hide();
        window.removeEventListener('blur', onBlur);
        clearTimeout(hardCapTimer);
        hardCapTimer = setTimeout(cleanup, 10000);
      }
    }, debounceMs);

    window.addEventListener('focus', onFocus, { once: true });
  };

  window.addEventListener('blur', onBlur);
  navigateTo(url);

  // Primary "not installed" path: no blur fired within timeoutMs (Firefox, or Drive truly absent).
  primaryTimer = setTimeout(() => {
    if (!appOpened) show();
  }, timeoutMs);

  hardCapTimer = setTimeout(cleanup, timeoutMs + 3000);
}
