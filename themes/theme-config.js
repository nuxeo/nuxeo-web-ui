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

import { config } from '@nuxeo/nuxeo-elements';

/**
 * NXENG-527 branding opt-in — single source of truth for theme availability.
 *
 * Provides theme management based on server branding mode:
 * - Branding OFF (default): offers classic Nuxeo themes
 * - Branding ON: offers new Hyland themes
 *
 * Controlled by server property `org.nuxeo.web.ui.branding.rebrand` from nuxeo.conf
 */

// Classic Nuxeo themes when branding is OFF.
const LEGACY_THEMES = Object.freeze(['default', 'dark']);

// New Hyland themes when branding is ON.
const BRANDING_THEMES = Object.freeze(['hyland-light', 'hyland-dark']);

// Maps themes between modes to preserve user preference when branding flag changes.
// Uses null prototype to prevent prototype pollution attacks.
const LEGACY_TO_BRANDING = Object.assign(Object.create(null), {
  default: 'hyland-light',
  dark: 'hyland-dark',
});
const BRANDING_TO_LEGACY = Object.assign(Object.create(null), {
  'hyland-light': 'default',
  'hyland-dark': 'dark',
});

/**
 * Checks if Hyland branding themes are enabled.
 *
 * Defensive by design: this runs during very early boot (via `themes/loader.js`),
 * possibly before `@nuxeo/nuxeo-elements`' config layer is initialized. If reading
 * the flag throws (e.g. `Nuxeo.UI.config` not ready), fall back to `false` so theme
 * loading never crashes and the app boots with the legacy default.
 * @returns {boolean} true if branding is enabled
 */
export function isBrandingEnabled() {
  try {
    return config.get('branding.rebrand', false);
  } catch (e) {
    console.warn('Failed to read branding flag; defaulting to legacy themes:', e?.message);
    return false;
  }
}

/**
 * Gets the default theme for the current branding mode.
 * @returns {string} theme name
 */
export function getDefaultTheme() {
  return isBrandingEnabled() ? 'hyland-light' : 'default';
}

/**
 * Determines if a theme should be hidden based on current branding mode.
 * Hides only built-in themes from the opposite mode; custom themes are shown
 * unless they use a reserved built-in name (`default`, `dark`, `hyland-light`,
 * `hyland-dark`), in which case they are treated as built-in.
 * @param {string} name - theme name
 * @returns {boolean} true if theme should be hidden
 */
export function shouldHideTheme(name) {
  return isBrandingEnabled() ? LEGACY_THEMES.includes(name) : BRANDING_THEMES.includes(name);
}

/**
 * Converts a theme name to one valid for the current branding mode.
 * Remaps known themes from opposite mode; leaves custom themes unchanged.
 * @param {string} name - theme name
 * @returns {string} resolved theme name
 */
export function resolveTheme(name) {
  if (!name) {
    return getDefaultTheme();
  }
  if (isBrandingEnabled()) {
    return LEGACY_TO_BRANDING[name] || name;
  }
  return BRANDING_TO_LEGACY[name] || name;
}
