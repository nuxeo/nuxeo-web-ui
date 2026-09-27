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

// WEBUI-2294: themes are plain .html files, so nothing type-checks them against each other.
// That let two real defects through: a restored theme silently missing variables the shared
// mixins in themes/base.js rely on, and kawaii aliasing --nuxeo-container-hover to
// --nuxeo-page-background, which in that theme is a background SHORTHAND (image + colour).
// `background-color: <shorthand>` is invalid, so the browser dropped the declaration and the
// secondary-nav hover/selected pill never painted. These tests pin both down for every theme.

const THEMES = ['default', 'dark', 'kawaii', 'light', 'hyland-light', 'hyland-dark'];

// Custom properties base.js reads WITHOUT a var() fallback are DERIVED from base.js itself rather
// than hardcoded: a hand-maintained list silently stops matching the moment someone adds a new
// no-fallback reference, which is exactly the drift this suite exists to catch.
//
// Excluded because they are supplied by the app at runtime, not by themes -- nuxeo-app.js sets them
// on the host, so no theme.html defines them and requiring one would be wrong.
const APP_PROVIDED = new Set(['--nuxeo-app-top', '--nuxeo-app-bottom']);

// Properties consumed somewhere as a bare colour. A background shorthand here is silently dropped.

const COLOUR_ONLY = ['--nuxeo-container-hover'];

const declarations = (css) => {
  const map = new Map();
  const re = /^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/gm;
  let m = re.exec(css);
  while (m) {
    if (!map.has(m[1])) {
      map.set(m[1], m[2].trim());
    }
    m = re.exec(css);
  }
  return map;
};

// Follow var(--a) aliases within one theme so the test sees the value the browser would compute.
const resolve = (map, name, seen = new Set()) => {
  if (seen.has(name)) {
    return undefined; // cyclic alias; treated as unresolvable
  }
  seen.add(name);
  const value = map.get(name);
  const alias = value && /^var\(\s*(--[a-zA-Z0-9-]+)\s*\)$/.exec(value);
  return alias ? resolve(map, alias[1], seen) : value;
};

suite('themes: shared custom-property interface', () => {
  const parsed = new Map();
  let requiredByBase = [];

  suiteSetup(async () => {
    await Promise.all(
      THEMES.map(async (name) => {
        const res = await fetch(`/themes/${name}/theme.html`);
        expect(res.ok, `could not load themes/${name}/theme.html`).to.be.true;
        parsed.set(name, declarations(await res.text()));
      }),
    );

    const baseRes = await fetch('/themes/base.js');
    expect(baseRes.ok, 'could not load themes/base.js').to.be.true;
    const baseSrc = await baseRes.text();
    // var(--x) with no comma => no fallback, so an undefined property kills the declaration.
    const refs = baseSrc.match(/var\(\s*--[a-zA-Z0-9-]+\s*\)/g) || [];
    requiredByBase = [...new Set(refs.map((r) => r.replace(/var\(\s*|\s*\)/g, '')))]
      .filter((prop) => !APP_PROVIDED.has(prop))
      .sort();
    expect(requiredByBase.length, 'expected base.js to read theme properties without fallbacks').to.be.above(10);
  });

  THEMES.forEach((name) => {
    test(`${name} defines every custom property base.js reads without a fallback`, () => {
      const map = parsed.get(name);
      const missing = requiredByBase.filter((prop) => !map.has(prop));
      expect(missing, `themes/${name}/theme.html is missing ${missing.join(', ')}`).to.be.empty;
    });

    test(`${name} resolves colour-only custom properties to a valid colour`, () => {
      const map = parsed.get(name);
      COLOUR_ONLY.forEach((prop) => {
        const value = resolve(map, prop);
        expect(value, `themes/${name}/theme.html: ${prop} does not resolve`).to.be.a('string');
        // The failure this guards against: `url(...) repeat #f8d3e0` is a valid `background`
        // but NOT a valid `background-color`, so the hover/pill declaration is dropped whole.
        expect(
          CSS.supports('background-color', value),
          `themes/${name}/theme.html: ${prop} resolves to "${value}", which is not valid for background-color`,
        ).to.be.true;
      });
    });
  });

  // The restored themes must carry the whole classic core -- every property that BOTH surviving
  // classic themes define. Comparing against the intersection rather than the union is deliberate:
  // dark legitimately adds properties the light themes do not need (--nuxeo-focus-outline,
  // --nuxeo-focus-ring-color, --paper-listbox-color, all for contrast on dark backgrounds), and
  // default carries --nuxeo-button-icon-margin that dark does not. Those pre-date this work; the
  // invariant worth enforcing is that no classic theme is missing the shared core.
  test('the restored classic themes carry the full shared classic core', () => {
    const core = [...parsed.get('default').keys()].filter((prop) => parsed.get('dark').has(prop));
    expect(core.length, 'expected a non-trivial shared core').to.be.above(50);
    ['kawaii', 'light'].forEach((name) => {
      const map = parsed.get(name);
      const missing = core.filter((prop) => !map.has(prop));
      expect(missing, `themes/${name}/theme.html is missing ${missing.join(', ')}`).to.be.empty;
    });
  });
});
