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
suiteTeardown(function reportFailedHooks() {
  function report(suite) {
    const hooks = [...suite._beforeAll, ...suite._beforeEach, ...suite._afterEach, ...suite._afterAll];
    [...suite.tests, ...hooks].forEach((test) => {
      if (test.state === 'failed') {
        // eslint-disable-next-line no-console
        console.error(`Failed test or hook: ${test.fullTitle()}: ${test.err ? test.err.message : 'hook failed'}`);
      }
    });
    suite.suites.forEach(report);
  }
  report(window.mocha.suite);
});

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

suite('l10nxvocabulary parent label (WEBUI-2230)', () => {
  test('names the parent button with its field label and current selected value', async () => {
    const element = await load(
      'nuxeo-l10nxvocabulary-edit-layout',
      'elements/directory/l10nxvocabulary/nuxeo-l10nxvocabulary-edit-layout.html',
    );
    const button = element.shadowRoot.querySelector('#selectParent');
    const label = element.shadowRoot.querySelector('#parent-label');
    expect(label.textContent.trim()).to.not.be.empty;
    expect(button.getAttribute('aria-labelledby').split(/\s+/)).to.deep.equal(['parent-label', 'selectParent']);
    element.set('entry', { properties: { id: 'child', parent: 'first-parent', obsolete: 0 } });
    await flush();
    expect(button.textContent.trim()).to.equal('first-parent');
    element.set('entry', { properties: { id: 'child', parent: 'second-parent', obsolete: 0 } });
    await flush();
    expect(button.textContent.trim()).to.equal('second-parent');
  });
});

// Validate the whole conversion, including markup nested in conditional templates.
// DOMParser keeps scripts inert, so this check cannot register layouts or start requests.
suite('all converted layout sources (WEBUI-2230)', () => {
  const paths = [
    'addons/easyshare/document/easysharefolder/nuxeo-easysharefolder-metadata-layout.html',
    'addons/nuxeo-imap-connector/document/mailfolder/nuxeo-mailfolder-metadata-layout.html',
    'addons/nuxeo-imap-connector/document/mailmessage/nuxeo-mailmessage-metadata-layout.html',
    'addons/nuxeo-platform-3d/document/threed/nuxeo-threed-metadata-layout.html',
    'addons/nuxeo-template-rendering/document/templatesource/nuxeo-templatesource-metadata-layout.html',
    'addons/nuxeo-template-rendering/document/webtemplatesource/nuxeo-webtemplatesource-metadata-layout.html',
    'elements/directory/l10nvocabulary/nuxeo-l10nvocabulary-edit-layout.html',
    'elements/directory/l10nxvocabulary/nuxeo-l10nxvocabulary-edit-layout.html',
    'elements/directory/vocabulary/nuxeo-vocabulary-edit-layout.html',
    'elements/directory/xvocabulary/nuxeo-xvocabulary-edit-layout.html',
    'elements/document/audio/nuxeo-audio-metadata-layout.html',
    'elements/document/collection/nuxeo-collection-metadata-layout.html',
    'elements/document/collections/nuxeo-collections-metadata-layout.html',
    'elements/document/domain/nuxeo-domain-metadata-layout.html',
    'elements/document/favorites/nuxeo-favorites-metadata-layout.html',
    'elements/document/file/nuxeo-file-metadata-layout.html',
    'elements/document/folder/nuxeo-folder-metadata-layout.html',
    'elements/document/note/nuxeo-note-metadata-layout.html',
    'elements/document/orderedfolder/nuxeo-orderedfolder-metadata-layout.html',
    'elements/document/picture/nuxeo-picture-metadata-layout.html',
    'elements/document/picturebook/nuxeo-picturebook-metadata-layout.html',
    'elements/document/root/nuxeo-root-metadata-layout.html',
    'elements/document/section/nuxeo-section-metadata-layout.html',
    'elements/document/sectionroot/nuxeo-sectionroot-metadata-layout.html',
    'elements/document/templateroot/nuxeo-templateroot-metadata-layout.html',
    'elements/document/userworkspacesroot/nuxeo-userworkspacesroot-metadata-layout.html',
    'elements/document/video/nuxeo-video-metadata-layout.html',
    'elements/document/workspace/nuxeo-workspace-metadata-layout.html',
    'elements/document/workspaceroot/nuxeo-workspaceroot-metadata-layout.html',
    'elements/search/expired/nuxeo-expired-search-form.html',
    'elements/search/trash/nuxeo-trash-search-form.html',
    'elements/workflow/paralleldocumentreview/nuxeo-task2169-layout.html',
    'elements/workflow/paralleldocumentreview/nuxeo-task328d-layout.html',
    'elements/workflow/serialdocumentreview/nuxeo-task6d8-layout.html',
  ];

  function allElements(root) {
    return [...root.querySelectorAll('*')].flatMap((element) =>
      element.localName === 'template' ? [element, ...allElements(element.content)] : [element],
    );
  }

  paths.forEach((path) => {
    test(path, async () => {
      const response = await fetch(new URL(`../${path}`, import.meta.url));
      expect(response.ok, path).to.be.true;
      const source = new DOMParser().parseFromString(await response.text(), 'text/html');
      const elements = allElements(source);
      expect(
        elements.filter((element) => element.localName === 'label'),
        path,
      ).to.be.empty;
      const labels = elements.filter((element) => element.classList.contains('label'));
      expect(labels, path).to.not.be.empty;
      labels.forEach((label) => {
        expect(label.localName, path).to.equal('span');
        expect(label.id, path).to.not.be.empty;
        expect(
          elements.filter((element) => element.id === label.id),
          label.id,
        ).to.have.lengthOf(1);
        const values = elements.filter((element) =>
          (element.getAttribute('aria-labelledby') || '').split(/\s+/).includes(label.id),
        );
        if (path.startsWith('elements/search/')) {
          // Search hosts retain their existing aria-label binding; the inner input
          // derives its accessible name from the dropdown placeholder.
          expect(
            elements.some((element) => element.hasAttribute('aria-label$')),
            path,
          ).to.be.true;
        } else {
          expect(values, `${path}: ${label.id}`).to.not.be.empty;
          if (!path.startsWith('elements/directory/')) {
            values.forEach((value) => expect(value.getAttribute('role'), label.id).to.equal('definition'));
          }
        }
      });
    });
  });
});
