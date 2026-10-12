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
import { fixture, flush, html, login } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-template-rendering-page.js';

const baseDocument = () => {
  return {
    uid: 'doc-1',
    properties: {
      'tmpl:templateType': 'Freemarker',
      'tmpl:allowOverride': true,
      'tmpl:applicableTypes': ['File'],
      'tmpl:templateData':
        '<nxdt:templateParams xmlns:nxdt="http://www.nuxeo.org/DocumentTemplate"><templateParams/></nxdt:templateParams>',
    },
  };
};

suite('nuxeo-template-rendering-page', () => {
  let server;
  let el;

  setup(async () => {
    server = await login();
    el = await fixture(html`<nuxeo-template-rendering-page></nuxeo-template-rendering-page>`);
    sinon.stub(el, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_getProcessorLabel', () => {
    test('returns i18n key for known processor', () => {
      expect(el._getProcessorLabel('auto')).to.equal('templateRenderingPage.processor.auto');
    });
  });

  suite('_getOutputFormatLabel', () => {
    test('maps none to i18n label', () => {
      expect(el._getOutputFormatLabel('none')).to.equal('templateRenderingPage.outputFormat.none');
    });

    test('uppercases other formats', () => {
      expect(el._getOutputFormatLabel('pdf')).to.equal('PDF');
    });

    test('returns null for empty format', () => {
      expect(el._getOutputFormatLabel('')).to.be.null;
    });
  });

  suite('_parseJSON and _findChangedValues', () => {
    test('_parseJSON deep-clones objects', () => {
      const src = { a: 1, nested: { b: 2 } };
      const copy = el._parseJSON(src);
      expect(copy).to.deep.equal(src);
      expect(copy).to.not.equal(src);
      copy.nested.b = 3;
      expect(src.nested.b).to.equal(2);
    });

    test('_findChangedValues detects scalar and object changes for keys present in original', () => {
      const original = { a: 1, obj: { x: 1 }, extra: 0 };
      const modified = { a: 2, obj: { x: 2 }, extra: 3 };
      const diff = el._findChangedValues(original, modified);
      expect(diff.a).to.equal(2);
      expect(diff.obj).to.deep.equal({ x: 2 });
      expect(diff.extra).to.equal(3);
    });
  });

  suite('_documentChanged', () => {
    test('clones document into editedDocument and defaults template type', async () => {
      el.document = baseDocument();
      await flush();
      expect(el.editedDocument.uid).to.equal('doc-1');
      expect(el.editedDocument.properties['tmpl:templateType']).to.equal('Freemarker');
    });

    test('defaults missing template type to auto', async () => {
      const doc = baseDocument();
      delete doc.properties['tmpl:templateType'];
      el.document = doc;
      await flush();
      expect(el.editedDocument.properties['tmpl:templateType']).to.equal('auto');
    });
  });

  suite('_handleDocTypes', () => {
    test('builds docTypes from server response', () => {
      el._handleDocTypes({
        detail: {
          response: {
            doctypes: { File: {}, Folder: {} },
          },
        },
      });
      expect(el.docTypes[0].id).to.equal('all');
      const ids = el.docTypes
        .slice(1)
        .map((d) => d.id)
        .sort();
      expect(ids).to.deep.equal(['File', 'Folder']);
    });

    test('orders doc types alphabetically regardless of case and accents', () => {
      el._handleDocTypes({
        detail: {
          response: {
            doctypes: { Zeta: {}, Élan: {}, apple: {}, Banana: {} },
          },
        },
      });
      expect(el.docTypes.slice(1).map((d) => d.id)).to.deep.equal(['apple', 'Banana', 'Élan', 'Zeta']);
    });
  });

  suite('config mode', () => {
    test('_editConfig switches to edit', async () => {
      el.configMode = 'view';
      el._editConfig();
      await flush();
      expect(el.configMode).to.equal('edit');
    });

    test('_cancelEditConfig resets and returns to view', async () => {
      el.document = baseDocument();
      await flush();
      el.configMode = 'edit';
      el.editedDocument.properties['tmpl:allowOverride'] = false;
      el._cancelEditConfig();
      await flush();
      expect(el.configMode).to.equal('view');
      expect(el.editedDocument.properties['tmpl:allowOverride']).to.be.true;
    });

    test('_saveEditConfig saves and returns to view', async () => {
      el.document = baseDocument();
      await flush();
      sinon.stub(el.$.doc, 'put').resolves();
      el.configMode = 'edit';
      await el._saveEditConfig();
      expect(el.$.doc.put).to.have.been.called;
      expect(el.configMode).to.equal('view');
    });
  });

  suite('parameters mode', () => {
    test('_editParams switches paramsMode to edit', async () => {
      el.paramsMode = 'view';
      el._editParams();
      await flush();
      expect(el.paramsMode).to.equal('edit');
    });

    test('_cancelEditParams resets editor and view mode', async () => {
      el.document = baseDocument();
      await flush();
      sinon.spy(el.$.paramEditor, 'reset');
      el.paramsMode = 'edit';
      el._cancelEditParams();
      await flush();
      expect(el.$.paramEditor.reset).to.have.been.called;
      expect(el.paramsMode).to.equal('view');
    });

    test('_saveEditParams commits template data and saves', async () => {
      el.document = baseDocument();
      await flush();
      sinon.stub(el.$.paramEditor, 'commitChanges');
      sinon.stub(el.$.paramEditor, 'generateTemplateData').returns('<nxdt:templateParams/>');
      sinon.stub(el.$.doc, 'put').resolves();
      el.paramsMode = 'edit';
      await el._saveEditParams();
      expect(el.$.paramEditor.commitChanges).to.have.been.called;
      expect(el.$.paramEditor.generateTemplateData).to.have.been.called;
      expect(el.$.doc.put).to.have.been.called;
      expect(el.paramsMode).to.equal('view');
    });
  });

  suite('_getTemplateData', () => {
    test('returns tmpl:templateData from editedDocument', async () => {
      el.document = baseDocument();
      await flush();
      expect(el._getTemplateData()).to.equal(el.editedDocument.properties['tmpl:templateData']);
    });
  });
});
