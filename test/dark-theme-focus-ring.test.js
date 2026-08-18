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
import { FOCUS_RULE, applyToRoot, installGlobalFocusRing } from '../themes/dark-theme-focus-ring.js';

// Collects the CSS text present in a root, whether the rule was adopted as a constructable
// stylesheet or injected as a <style> fallback, so assertions work on both engine paths.
function collectRootCss(root) {
  const chunks = [];
  const sheets = Array.isArray(root.adoptedStyleSheets) ? root.adoptedStyleSheets : [];
  sheets.forEach((sheet) => {
    try {
      Array.from(sheet.cssRules).forEach((rule) => chunks.push(rule.cssText));
    } catch (e) {
      /* ignore cross-origin / inaccessible sheets */
    }
  });
  const styleHost = root === document ? document.head : root;
  if (styleHost) {
    styleHost.querySelectorAll('style').forEach((style) => chunks.push(style.textContent || ''));
  }
  return chunks.join('\n');
}

function countFocusSheets(root) {
  const sheets = Array.isArray(root.adoptedStyleSheets) ? root.adoptedStyleSheets : [];
  const adopted = sheets.filter((sheet) => {
    try {
      return Array.from(sheet.cssRules).some((rule) => rule.cssText.includes(':focus-visible'));
    } catch (e) {
      return false;
    }
  }).length;
  const styleHost = root === document ? document.head : root;
  const styleTags = styleHost
    ? Array.from(styleHost.querySelectorAll('style')).filter((style) =>
        (style.textContent || '').includes(':focus-visible'),
      ).length
    : 0;
  return adopted + styleTags;
}

suite('focus-ring', () => {
  // Install once for the whole run. attachShadow is patched permanently on purpose (real app
  // code relies on it), so we never un-patch it; we only clean up DOM nodes we create.
  suiteSetup(() => {
    installGlobalFocusRing();
  });

  suite('FOCUS_RULE', () => {
    test('targets the allowlisted primitives via :focus-visible', () => {
      expect(FOCUS_RULE).to.contain('paper-icon-button');
      expect(FOCUS_RULE).to.contain('paper-button');
      expect(FOCUS_RULE).to.contain(':focus-visible');
    });

    test('consumes the themeable outline token with a none fallback', () => {
      expect(FOCUS_RULE).to.contain('var(--nuxeo-focus-outline, none)');
    });

    test('draws the ring inset so it is not clipped by overflow containers', () => {
      expect(FOCUS_RULE).to.contain('outline-offset: -2px');
    });

    test('is wrapped in :where() so it contributes zero specificity', () => {
      expect(FOCUS_RULE).to.contain(':where(');
    });
  });

  suite('installGlobalFocusRing', () => {
    test('applies the focus rule to the document', () => {
      expect(collectRootCss(document)).to.contain(':focus-visible');
    });

    test('is idempotent — calling it again does not duplicate the document sheet', () => {
      const before = countFocusSheets(document);
      installGlobalFocusRing();
      expect(countFocusSheets(document)).to.equal(before);
    });

    test('injects the rule into shadow roots created after install', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      try {
        const root = host.attachShadow({ mode: 'open' });
        expect(collectRootCss(root)).to.contain(':focus-visible');
      } finally {
        host.remove();
      }
    });

    test('does not adopt the rule twice into a freshly attached shadow root', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      try {
        const root = host.attachShadow({ mode: 'open' });
        expect(countFocusSheets(root)).to.equal(1);
      } finally {
        host.remove();
      }
    });
  });

  suite('patched attachShadow', () => {
    test('carries the __nuxeoFocusPatched marker', () => {
      expect(Element.prototype.attachShadow.__nuxeoFocusPatched).to.be.true;
    });

    test('still returns a functional shadow root that preserves native behavior', () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      try {
        const root = host.attachShadow({ mode: 'open' });
        expect(root).to.be.an.instanceof(ShadowRoot);
        expect(host.shadowRoot).to.equal(root);
        expect(root.mode).to.equal('open');
        root.innerHTML = '<span>child</span>';
        expect(root.querySelector('span').textContent).to.equal('child');
      } finally {
        host.remove();
      }
    });
  });

  suite('applyToRoot never-throws contract', () => {
    test('does nothing and does not throw for a null root', () => {
      expect(() => applyToRoot(null)).to.not.throw();
      expect(() => applyToRoot(undefined)).to.not.throw();
    });

    test('does not throw for a bogus root without adoptedStyleSheets', () => {
      expect(() => applyToRoot({})).to.not.throw();
    });
  });
});
