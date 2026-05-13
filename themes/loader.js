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
// Validate that the theme name is a safe single path segment.
// Only alphanumeric characters, hyphens, and underscores are allowed.
// This allowlist approach prevents path traversal, encoded characters, and URL manipulation.
export const SAFE_THEME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function safeSetTheme(value) {
  try {
    localStorage.setItem('theme', value);
  } catch (e) {
    // localStorage may be unavailable (e.g., private browsing); theme will not persist.
    console.warn('Failed to persist theme preference:', e.message);
  }
}

export function getValidTheme() {
  let raw;
  try {
    raw = localStorage.getItem('theme');
  } catch (_) {
    // localStorage may be unavailable (e.g., private browsing)
    return 'default';
  }
  const theme = raw?.trim();
  if (theme && SAFE_THEME_PATTERN.test(theme)) {
    // Normalize: persist trimmed value if it differs from stored value.
    if (theme !== raw) {
      safeSetTheme(theme);
    }
    return theme;
  }
  // Only correct localStorage when there was an invalid stored value, not when the key is absent.
  if (raw != null) {
    safeSetTheme('default');
  }
  return 'default';
}

let resolvedTheme = getValidTheme();
const url = `themes/${resolvedTheme}/theme.html`;
const xhr = new XMLHttpRequest();
xhr.open('HEAD', url, false);
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4) {
    if (xhr.status === 404) {
      console.warn(`"${resolvedTheme}" theme not found, fallback to "default".`);
      resolvedTheme = 'default';
      safeSetTheme(resolvedTheme);
    }
    const link = document.createElement('link');
    link.setAttribute('rel', 'import');
    link.setAttribute('href', `themes/${resolvedTheme}/theme.html`);
    document.head.appendChild(link);
  }
};
xhr.send(null);
