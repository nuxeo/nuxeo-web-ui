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
import { getDefaultTheme, resolveTheme } from './theme-config.js';
// Validate that the theme name is a safe single path segment.
// Only alphanumeric characters, hyphens, and underscores are allowed.
// This allowlist approach prevents path traversal, encoded characters, and URL manipulation.
export const SAFE_THEME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function safeSetTheme(value) {
  try {
    localStorage.setItem('theme', value);
  } catch (e) {
    // Storage may be unavailable in private browsing mode.
    console.warn('Failed to persist theme preference:', e?.message ?? String(e));
  }
}

export function getValidTheme() {
  let raw;
  try {
    raw = localStorage.getItem('theme');
  } catch (e) {
    // Storage unavailable; return deployment default.
    console.warn('Failed to read theme preference:', e?.message ?? String(e));
    return getDefaultTheme();
  }
  const theme = raw?.trim();
  if (theme && SAFE_THEME_PATTERN.test(theme)) {
    // Map themes to handle branding mode changes while preserving user preference.
    const resolved = resolveTheme(theme);
    // Update storage if the resolved theme differs from stored value.
    if (resolved !== raw) {
      safeSetTheme(resolved);
    }
    return resolved;
  }
  // Invalid or missing theme: use the deployment default. Only rewrite storage to correct an
  // invalid stored value; when nothing was stored (raw === null) leave storage untouched.
  const fallback = getDefaultTheme();
  if (raw != null) {
    safeSetTheme(fallback);
  }
  return fallback;
}

export function loadTheme() {
  let resolvedTheme = getValidTheme();
  const url = `themes/${resolvedTheme}/theme.html`;
  const xhr = new XMLHttpRequest();
  xhr.open('HEAD', url, false);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 404) {
        // Theme file not found; fall back to default.
        const defaultTheme = getDefaultTheme();
        console.warn(`"${resolvedTheme}" theme not found, fallback to "${defaultTheme}".`);
        resolvedTheme = defaultTheme;
        safeSetTheme(resolvedTheme);
      }
      const link = document.createElement('link');
      link.setAttribute('rel', 'import');
      link.setAttribute('href', `themes/${resolvedTheme}/theme.html`);
      document.head.appendChild(link);
    }
  };
  xhr.send(null);
}

// Expose theme resolver for legacy inline scripts that cannot import ES modules.
window.Nuxeo = window.Nuxeo || {};
window.Nuxeo.UI = window.Nuxeo.UI || {};
// Lock the property to prevent accidental overwrites by runtime code.
if (!window.Nuxeo.UI.getValidTheme) {
  Object.defineProperty(window.Nuxeo.UI, 'getValidTheme', {
    value: getValidTheme,
    writable: false,
    configurable: false,
    enumerable: true,
  });
}

// NOTE: loadTheme() is intentionally NOT invoked here as a module side effect. Running it at
// import time performs a synchronous XHR + DOM mutation and reads config state, which makes
// import order significant and prevents importing this module from tests / non-browser
// runtimes without triggering networking. The bootstrap (index.js) calls loadTheme() explicitly,
// early and once, so the theme is still applied before first paint.
