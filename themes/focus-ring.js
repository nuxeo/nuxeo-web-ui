/**
@license
©2026 Hyland Software, Inc. and its affiliates. All rights reserved. 
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
 * Global keyboard-focus visibility fix (accessibility: WCAG 2.4.11 / 2.4.13).
 *
 * SCOPE: this only changes focus in DARK THEMES. The rule is injected everywhere, but it
 * paints a ring only where `--nuxeo-focus-outline` is defined — and that token is set
 * exclusively by the dark themes. In every other (light) theme the fallback is `none`, so
 * focus behaviour is left exactly as it was.
 *
 * Some leaf controls rely on the browser's user-agent `:focus-visible` ring
 * (`outline: -webkit-focus-ring-color auto 1px`), or show no ring at all (only a
 * ripple). That user-agent colour is a fixed system colour which does NOT adapt to
 * the page background, so on dark themes the ring is effectively invisible — the
 * focus indicator "is applied but cannot be seen".
 *
 * Those controls live inside component shadow roots, so document-level CSS cannot
 * reach them; only custom properties inherit across the shadow boundary. To make the
 * ring themeable without editing every component, we adopt one rule into every shadow
 * root (and the main document):
 *
 *   :where(paper-icon-button, paper-button):focus-visible
 *     { outline: var(--nuxeo-focus-outline, none); outline-offset: -2px; }
 *
 * The ring is drawn INSET (`outline-offset: -2px`) so it hugs the inner edge of the
 * control. Without this, the outline is painted OUTSIDE the box and gets clipped —
 * typically on the left/leading edge — whenever the primitive sits flush against an
 * `overflow: hidden` container (toolbars, tight flex rows), which shows as a ring that
 * is missing one side.
 *
 * - Dark themes define `--nuxeo-focus-outline` (a bright, high-contrast ring), so
 *   keyboard focus on these primitives becomes visible.
 * - Every other theme leaves the token undefined, so the `none` fallback keeps these
 *   primitives ring-less (their original ripple-only state) — light themes unchanged.
 *
 * ── Why an ALLOWLIST and not a blanket `:focus-visible` selector ──────────────────
 *
 * The rule is adopted into EVERY shadow root, so relative to any custom element it
 * lives in that element's OUTER tree. In the shadow-DOM cascade a NORMAL declaration
 * from an outer tree BEATS a NORMAL declaration from an inner tree, regardless of
 * specificity. A blanket `:focus-visible { outline: … }` therefore overrode each
 * component's OWN `:host(:focus)/:host(:focus-visible)` styling and forced an outline
 * onto hosts that already indicate focus/selection some other way (grid/list cards,
 * data-table rows, sidenav items, the comment editor, the resize handle …). That
 * over-covering was the recurring regression: a bright rectangle stamped on top of a
 * component's own indicator.
 *
 * The fix is to be NON-DESTRUCTIVE:
 *   1. Only target genuinely ring-less leaf PRIMITIVES — `paper-icon-button` and
 *      `paper-button`, which show just a ripple. Custom-element hosts are never
 *      matched, so their own host-level focus/selection styling is left untouched.
 *   2. Wrap the primitive list in `:where(…)` so the injected rule contributes ZERO
 *      specificity (its only weight is the `:focus-visible` pseudo-class). Any rule a
 *      component defines for the SAME primitive in its OWN tree (e.g. an action
 *      button's `paper-icon-button:focus-visible`, or `#iconButton:focus-visible`)
 *      out-specifies this rule and wins within that tree.
 *
 * The allowlist is intentionally minimal: under-covering (leaving a primitive on its
 * original ring) is acceptable; over-covering a self-indicating host is not. Add another
 * entry only after verifying it is a ring-less primitive, not a host that styles its own
 * focus. Every other element keeps its own original focus styling untouched in all themes;
 * this injector is the only place that consumes `--nuxeo-focus-outline`.
 */

export const FOCUS_RULE =
  ':where(paper-icon-button, paper-button):focus-visible { outline: var(--nuxeo-focus-outline, none); outline-offset: -2px; }';

// Prefer a single shared constructable stylesheet (cheap to adopt into many roots).
let focusStyleSheet = null;
const supportsConstructableStyleSheets =
  typeof ShadowRoot !== 'undefined' &&
  'adoptedStyleSheets' in Document.prototype &&
  'adoptedStyleSheets' in ShadowRoot.prototype &&
  typeof CSSStyleSheet !== 'undefined' &&
  typeof CSSStyleSheet.prototype.replaceSync === 'function';

if (supportsConstructableStyleSheets) {
  try {
    focusStyleSheet = new CSSStyleSheet();
    focusStyleSheet.replaceSync(FOCUS_RULE);
  } catch (e) {
    focusStyleSheet = null;
  }
}

function createFocusStyleElement() {
  const style = document.createElement('style');
  style.textContent = FOCUS_RULE;
  return style;
}

/**
 * Applies the focus rule to a root (a ShadowRoot or the Document). Never throws —
 * a focus-ring enhancement must not be able to break element construction.
 */
export function applyToRoot(root) {
  if (!root) {
    return;
  }
  try {
    if (focusStyleSheet && Array.isArray(root.adoptedStyleSheets)) {
      if (!root.adoptedStyleSheets.includes(focusStyleSheet)) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, focusStyleSheet];
      }
      return;
    }
    // Fallback for engines without constructable stylesheets.
    const target = root === document ? document.head : root;
    if (target) {
      target.appendChild(createFocusStyleElement());
    }
  } catch (e) {
    /* no-op: styling is best-effort */
  }
}

let focusRingInstalled = false;

/**
 * Installs the global focus ring. Idempotent. Must run before application custom
 * elements attach their shadow roots (called early from index.js), so the rule is
 * present in every root from first paint.
 */
export function installGlobalFocusRing() {
  if (focusRingInstalled) {
    return;
  }
  focusRingInstalled = true;

  // Light-DOM focusables (e.g. the nuxeo-app host).
  applyToRoot(document);

  // Patch attachShadow so every shadow root created afterwards inherits the rule.
  const originalAttachShadow = Element.prototype.attachShadow;
  if (typeof originalAttachShadow === 'function' && !originalAttachShadow.__nuxeoFocusPatched) {
    const patchedAttachShadow = function attachShadow(init) {
      const root = originalAttachShadow.call(this, init);
      applyToRoot(root);
      return root;
    };
    patchedAttachShadow.__nuxeoFocusPatched = true;
    Element.prototype.attachShadow = patchedAttachShadow;
  }
}
