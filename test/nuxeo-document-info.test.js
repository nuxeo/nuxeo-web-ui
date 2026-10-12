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
import { fixture, html, login } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-document-info/nuxeo-document-info.js';

suite('nuxeo-document-info', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-info></nuxeo-document-info>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default _showProcess to false', () => {
      expect(element._showProcess).to.be.false;
    });
  });

  suite('_showPub', () => {
    test('should return true when doc has publications with results', () => {
      const doc = { contextParameters: { publications: { resultsCount: 3 } } };
      expect(element._showPub(doc)).to.be.ok;
    });

    test('should return false when doc has no publications', () => {
      const doc = { contextParameters: {} };
      expect(element._showPub(doc)).to.not.be.ok;
    });

    test('should return false when resultsCount is 0', () => {
      const doc = { contextParameters: { publications: { resultsCount: 0 } } };
      expect(element._showPub(doc)).to.not.be.ok;
    });
  });

  suite('text spacing (WCAG 1.4.12)', () => {
    // Reproduces what the running app applies to these labels: the truncation carried by the theme's
    // --nuxeo-label mixin, plus the text spacing a user is allowed to override per WCAG 2.1 AA 1.4.12.
    const THEME_AND_SPACING_CSS = `
      label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      label {
        line-height: 1.5 !important;
        letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important;
      }
    `;

    setup(() => {
      const style = document.createElement('style');
      style.textContent = THEME_AND_SPACING_CSS;
      element.shadowRoot.appendChild(style);
    });

    test('should let labels wrap instead of truncating them', () => {
      const labels = Array.from(element.shadowRoot.querySelectorAll('.item label'));
      expect(labels.length).to.be.above(0);
      labels.forEach((label) => {
        const labelStyle = getComputedStyle(label);
        expect(labelStyle.whiteSpace).to.equal('normal');
        expect(labelStyle.overflow).to.equal('visible');
        expect(labelStyle.textOverflow).to.equal('clip');
      });
    });

    test('should not lose label content when the user overrides text spacing', () => {
      const row = document.createElement('div');
      row.className = 'item';
      const label = document.createElement('label');
      // a translated label ("Last Modified" in French) — longer than the label column, so it has to wrap
      label.textContent = 'Dernière modification';
      row.appendChild(label);
      element.shadowRoot.appendChild(row);
      expect(label.scrollWidth, 'label text is truncated').to.be.at.most(label.clientWidth + 1);
    });
  });

  suite('_documentChanged', () => {
    test('should set _showProcess to true when doc has running workflows', () => {
      element.document = {
        contextParameters: { runningWorkflows: [{ id: 'wf-1' }] },
      };
      element._documentChanged();
      expect(element._showProcess).to.be.true;
    });

    test('should set _showProcess to false when no running workflows', () => {
      element.document = {
        contextParameters: { runningWorkflows: [] },
      };
      element._documentChanged();
      expect(element._showProcess).to.be.false;
    });
  });
});
