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
import '@webcomponents/html-imports/html-imports.min.js';
import { Polymer } from '@polymer/polymer/polymer-legacy.js';
import { fixture, html, flush } from '@nuxeo/testing-helpers';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';

// The layouts under test are legacy HTML `dom-module`s loaded via HTML imports.
// Expose the globals their `<script>` registrations rely on before importing them.
window.Polymer = Polymer;
const _nxRoot = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
_nxRoot.Nuxeo = _nxRoot.Nuxeo || {};
_nxRoot.Nuxeo.LayoutBehavior = LayoutBehavior;
_nxRoot.Nuxeo.I18nBehavior = I18nBehavior;

const { url } = import.meta;
const base = url.substring(0, url.lastIndexOf('/'));

function loadHtmlImport(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'import';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = (e) => reject(e);
    document.head.appendChild(link);
  });
}

async function load(is, relativePath) {
  await loadHtmlImport(`${base}/../${relativePath}`);
  await customElements.whenDefined(is);
  const element = await fixture(html`<div></div>`);
  element.appendChild(document.createElement(is));
  await flush();
  return element.firstElementChild;
}

/**
 * WEBUI-2230: layouts must not hand-roll a `<label>`. A `<label>` with no `for` and no nested
 * control is a SonarCloud Web:S6853 finding and gives a screen-reader user no relationship
 * between the field name and the value or control beside it.
 */
suite('layout label association (WEBUI-2230)', () => {
  const metadataLayouts = [
    ['nuxeo-file-metadata-layout', 'elements/document/file/nuxeo-file-metadata-layout.html'],
    ['nuxeo-note-metadata-layout', 'elements/document/note/nuxeo-note-metadata-layout.html'],
    ['nuxeo-video-metadata-layout', 'elements/document/video/nuxeo-video-metadata-layout.html'],
  ];

  metadataLayouts.forEach(([is, path]) => {
    suite(is, () => {
      let element;

      suiteSetup(async () => {
        element = await load(is, path);
      });

      test('renders no bare <label>', () => {
        expect(element.shadowRoot.querySelectorAll('label')).to.have.lengthOf(0);
      });

      test('renders every field name as a .label carrying an id', () => {
        const labels = [...element.shadowRoot.querySelectorAll('.label')];
        expect(labels).to.not.be.empty;
        labels.forEach((label) => expect(label.id, label.textContent).to.not.be.empty);
      });

      test('points each value element at its own label', () => {
        const labels = [...element.shadowRoot.querySelectorAll('.label')];
        labels.forEach((label) => {
          const value = label.parentElement.querySelector(`[aria-labelledby~="${label.id}"]`);
          expect(value, `no value element labelled by "${label.id}"`).to.not.be.null;
          // aria-label* is only exposed on elements that support naming from the author,
          // so the value element must declare a role rather than stay generic.
          expect(value.getAttribute('role'), label.id).to.equal('definition');
        });
      });
    });
  });

  suite('nuxeo-vocabulary-edit-layout', () => {
    let element;

    suiteSetup(async () => {
      element = await load(
        'nuxeo-vocabulary-edit-layout',
        'elements/directory/vocabulary/nuxeo-vocabulary-edit-layout.html',
      );
    });

    test('renders no bare <label>', () => {
      expect(element.shadowRoot.querySelectorAll('label')).to.have.lengthOf(0);
    });

    test('gives the obsolete toggle an accessible name from a scoped label id', () => {
      const label = element.shadowRoot.querySelector('.label');
      // A bare id="label" is not unique across a document; the id must be field-scoped.
      expect(label.id).to.equal('obsolete-label');
      const toggle = element.shadowRoot.querySelector('paper-toggle-button');
      expect(toggle.getAttribute('aria-labelledby')).to.equal(label.id);
    });
  });
});
