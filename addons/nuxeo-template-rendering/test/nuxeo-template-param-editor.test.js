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
import '../elements/nuxeo-template-param-editor.js';

const sampleTemplateData = `<?xml version="1.0"?>
<nxdt:templateParams xmlns:nxdt="http://www.nuxeo.org/DocumentTemplate">
  <templateParams>
    <field name="title" type="String" value="Hello"/>
    <field name="flag" type="Boolean" value="true"/>
  </templateParams>
</nxdt:templateParams>`;

suite('nuxeo-template-param-editor', () => {
  let server;
  let el;

  setup(async () => {
    server = await login();
    el = await fixture(html`<nuxeo-template-param-editor></nuxeo-template-param-editor>`);
    sinon.stub(el, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_readTemplateParams', () => {
    test('parses empty templateData to default document', async () => {
      el.templateData = '';
      await flush();
      expect(el._hasParams()).to.be.false;
    });

    test('parses template XML and exposes params', async () => {
      el.templateData = sampleTemplateData;
      await flush();
      expect(el._hasParams()).to.be.true;
      const params = el._getParams();
      expect(params.length).to.equal(2);
      expect(el._getParamAttribute(params[0], 'name')).to.equal('title');
      expect(el._getParamAttribute(params[0], 'type')).to.equal('String');
    });
  });

  suite('generateTemplateData and reset', () => {
    test('generateTemplateData serializes current params tree', async () => {
      el.templateData = sampleTemplateData;
      await flush();
      const xml = el.generateTemplateData();
      expect(xml).to.include('name="title"');
      expect(xml).to.include('type="String"');
    });

    test('reset re-reads templateData', async () => {
      el.templateData = sampleTemplateData;
      await flush();
      el.reset();
      await flush();
      expect(el._hasParams()).to.be.true;
    });
  });

  suite('helpers', () => {
    test('_getParamTypeLabel delegates to i18n', () => {
      expect(el._getParamTypeLabel('String')).to.equal('templateRenderingPage.paramType.String');
    });

    test('_getContentTypeLabel delegates to i18n', () => {
      expect(el._getContentTypeLabel('xpath')).to.equal('templateRenderingPage.paramType.content.xpath');
    });

    test('_isSelectedParamType compares type', async () => {
      el.set('selectedParamProperties.type', 'Date');
      await flush();
      expect(el._isSelectedParamType('Date')).to.be.true;
      expect(el._isSelectedParamType('String')).to.be.false;
    });

    test('_isSelectedContentTypeXPath', async () => {
      el.set('selectedParamProperties.contentType', 'xpath');
      await flush();
      expect(el._isSelectedContentTypeXPath('xpath')).to.be.true;
      el.set('selectedParamProperties.contentType', 'htmlPreview');
      await flush();
      expect(el._isSelectedContentTypeXPath('htmlPreview')).to.be.false;
    });
  });

  suite('_refreshParams', () => {
    test('reassigns params so Polymer notifies dependents', async () => {
      el.templateData = sampleTemplateData;
      await flush();
      sinon.spy(el, 'set');
      el._refreshParams();
      expect(el.set).to.have.been.calledWith('params', null);
      const restored = el.set.getCalls().find((c) => c.args[0] === 'params' && c.args[1] != null);
      expect(restored).to.be.ok;
    });
  });

  suite('_formatSignature and _canEdit', () => {
    test('_formatSignature returns change attribute', async () => {
      el.templateData = sampleTemplateData;
      await flush();
      const param = el._getParams()[0];
      el._setParamAttribute(param, 'change', 'edited');
      expect(el._formatSignature(param)).to.equal('edited');
    });

    test('_canEdit is false when param is deleted', async () => {
      el.templateData = sampleTemplateData;
      await flush();
      const param = el._getParams()[0];
      el._setParamAttribute(param, 'change', 'deleted');
      expect(el._canEdit(param)).to.be.false;
    });
  });

  suite('_getParamValue and _getParamValueWithLoop', () => {
    test('reads value for String type', async () => {
      el.templateData = sampleTemplateData;
      await flush();
      const param = el._getParams()[0];
      expect(el._getParamValue(param)).to.equal('Hello');
    });

    test('appends autoloop label when set', async () => {
      const xml = `<?xml version="1.0"?>
<nxdt:templateParams xmlns:nxdt="http://www.nuxeo.org/DocumentTemplate">
  <templateParams>
    <field name="src" type="source" source="/path" autoloop="true"/>
  </templateParams>
</nxdt:templateParams>`;
      el.templateData = xml;
      await flush();
      const param = el._getParams()[0];
      expect(el._getParamValueWithLoop(param)).to.include('/path');
      expect(el._getParamValueWithLoop(param)).to.include('templateRenderingPage.parameters.autoloop');
    });
  });
});
