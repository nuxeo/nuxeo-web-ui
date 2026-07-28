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
import '../elements/nuxeo-render-template-button.js';

const makeTemplate = (overrides = {}) => {
  return {
    properties: {
      'dc:title': 'My template',
      'dc:description': 'Desc',
      'tmpl:templateName': 'tmpl1',
      'tmpl:templateData': '',
      'tmpl:allowOverride': false,
      ...overrides,
    },
  };
};

suite('nuxeo-render-template-button', () => {
  let server;
  let el;
  const doc = {
    uid: 'uid-1',
    properties: {
      'nxts:bindings': [],
    },
  };

  setup(async () => {
    server = await login();
    el = await fixture(html`
      <nuxeo-render-template-button
        .document="${doc}"
        filter-op="TemplateRendering.Filter"
        render-op="TemplateRendering.Render"
      ></nuxeo-render-template-button>
    `);
    sinon.stub(el, 'i18n').callsFake((key, ...args) => [key, ...args].join('|'));
    sinon.stub(el, 'notify');
  });

  teardown(() => {
    server.restore();
  });

  suite('_toggleDialog', () => {
    test('shows toast when no templates returned', async () => {
      sinon.stub(el.$.getTemplatesOp, 'execute').resolves({ entries: [] });
      el._toggleDialog();
      await el.$.getTemplatesOp.execute.firstCall.returnValue;
      expect(el.notify).to.have.been.calledWith(
        sinon.match({
          message: 'renderTemplateButton.toast.noTemplates',
        }),
      );
    });

    test('opens dialog when multiple templates exist', async () => {
      sinon.spy(el.$.dialog, 'toggle');
      sinon
        .stub(el.$.getTemplatesOp, 'execute')
        .resolves({ entries: [makeTemplate(), makeTemplate({ 'dc:title': 'Second' })] });
      el.skipRenderPopup = false;
      el._toggleDialog();
      await el.$.getTemplatesOp.execute.firstCall.returnValue;
      expect(el.$.dialog.toggle).to.have.been.called;
    });

    test('skips dialog and renders when single template and skipRenderPopup', async () => {
      sinon.stub(el.$.getTemplatesOp, 'execute').resolves({ entries: [makeTemplate()] });
      sinon.stub(el.$.renderTemplateOp, 'execute').resolves({});
      sinon.stub(el, '_download').resolves();
      el.skipRenderPopup = true;
      el._toggleDialog();
      await el.$.getTemplatesOp.execute.firstCall.returnValue;
      await el.$.renderTemplateOp.execute.firstCall.returnValue;
      expect(el.$.renderTemplateOp.execute).to.have.been.called;
    });
  });

  suite('_render', () => {
    test('calls render operation when override not allowed', async () => {
      const tpl = makeTemplate({ 'tmpl:allowOverride': false });
      el.set('_templates', [tpl]);
      el.set('selectedTemplate', tpl);
      sinon.stub(el.$.renderTemplateOp, 'execute').resolves({});
      sinon.stub(el, '_download').resolves();
      el.$.dialog.opened = false;
      el._render();
      await el.$.renderTemplateOp.execute.firstCall.returnValue;
      expect(el.$.renderTemplateOp.input).to.equal('uid-1');
      expect(el.$.renderTemplateOp.params.templateName).to.equal('tmpl1');
      expect(el.notify).to.have.been.called;
    });

    test('closes dialog when it was open', async () => {
      const tpl = makeTemplate({ 'tmpl:allowOverride': false });
      el.set('_templates', [tpl]);
      el.set('selectedTemplate', tpl);
      sinon.stub(el.$.renderTemplateOp, 'execute').resolves({});
      sinon.stub(el, '_download').resolves();
      sinon.spy(el.$.dialog, 'toggle');
      el.$.dialog.opened = true;
      el._render();
      await el.$.renderTemplateOp.execute.firstCall.returnValue;
      expect(el.$.dialog.toggle).to.have.been.called;
    });

    test('opens param editor when override allowed and template has data', async () => {
      const tpl = makeTemplate({
        'tmpl:allowOverride': true,
        'tmpl:templateData':
          '<nxdt:templateParams xmlns:nxdt="http://www.nuxeo.org/DocumentTemplate"><templateParams/></nxdt:templateParams>',
      });
      el.set('_templates', [tpl]);
      el.set('selectedTemplate', tpl);
      sinon.spy(el.$.editParamsDialog, 'toggle');
      sinon.stub(el.$.paramEditor, 'reset');
      el._render();
      expect(el.$.paramEditor.reset).to.have.been.called;
      expect(el.$.editParamsDialog.toggle).to.have.been.called;
    });
  });

  suite('_reset and _override', () => {
    test('_reset delegates to param editor', () => {
      sinon.stub(el.$.paramEditor, 'reset');
      el._reset();
      expect(el.$.paramEditor.reset).to.have.been.called;
    });

    test('_override commits and runs render', async () => {
      const tpl = makeTemplate({ 'tmpl:allowOverride': false });
      el.set('selectedTemplate', tpl);
      sinon.stub(el.$.paramEditor, 'commitChanges');
      sinon.stub(el.$.paramEditor, 'generateTemplateData').returns('<data/>');
      sinon.stub(el.$.renderTemplateOp, 'execute').resolves({});
      sinon.stub(el, '_download').resolves();
      sinon.spy(el.$.editParamsDialog, 'toggle');
      el._override();
      expect(el.$.paramEditor.commitChanges).to.have.been.called;
      await el.$.renderTemplateOp.execute.firstCall.returnValue;
      expect(el.$.editParamsDialog.toggle).to.have.been.called;
    });
  });

  suite('_renderOpWithParams', () => {
    test('toasts error when render fails', async () => {
      const tpl = makeTemplate({ 'tmpl:allowOverride': false });
      el.set('selectedTemplate', tpl);
      sinon.stub(el.$.renderTemplateOp, 'execute').rejects({ message: 'boom' });
      await el._renderOpWithParams();
      expect(el.notify).to.have.been.calledWith(
        sinon.match({
          message: sinon.match(/renderTemplateButton.toast.render.error/),
        }),
      );
    });
  });

  suite('_download', () => {
    test('rejects when Content-Disposition header is missing', async () => {
      let caught;
      try {
        await el._download({
          headers: { get: () => null },
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).to.be.instanceof(Error);
      expect(caught.message).to.equal('missing Content-Disposition header');
    });

    test('creates object URL and triggers download when header present', async () => {
      const blob = new Blob(['x']);
      const response = {
        headers: {
          get: (name) => (name === 'Content-Disposition' ? 'attachment; filename="hello.txt"' : null),
        },
        blob: () => Promise.resolve(blob),
      };
      const createSpy = sinon.stub(URL, 'createObjectURL').returns('blob:mock-url');
      const revokeSpy = sinon.stub(URL, 'revokeObjectURL');
      const clickSpy = sinon.spy(HTMLAnchorElement.prototype, 'click');
      try {
        await el._download(response);
        expect(createSpy).to.have.been.calledOnce;
        expect(createSpy.firstCall.args[0]).to.be.instanceof(Blob);
        expect(clickSpy).to.have.been.calledOnce;
        expect(revokeSpy).to.have.been.calledWith('blob:mock-url');
      } finally {
        createSpy.restore();
        revokeSpy.restore();
        clickSpy.restore();
      }
    });

    test('saves a filename with spaces without the quotes the server added', async () => {
      const response = {
        headers: {
          get: (name) =>
            name === 'Content-Disposition'
              ? `attachment; filename="my file.pdf"; filename*=UTF-8''my%20file.pdf`
              : null,
        },
        blob: () => Promise.resolve(new Blob(['x'])),
      };
      const createSpy = sinon.stub(URL, 'createObjectURL').returns('blob:mock-url');
      const revokeSpy = sinon.stub(URL, 'revokeObjectURL');
      let downloadAttr;
      const clickSpy = sinon.stub(HTMLAnchorElement.prototype, 'click').callsFake(function () {
        downloadAttr = this.getAttribute('download');
      });
      try {
        await el._download(response);
        expect(downloadAttr).to.equal('my file.pdf');
      } finally {
        createSpy.restore();
        revokeSpy.restore();
        clickSpy.restore();
      }
    });
  });

  suite('_filenameFromContentDisposition', () => {
    [
      {
        name: 'prefers the unquoted filename* form over the quoted filename form',
        header: `attachment; filename="my file.pdf"; filename*=UTF-8''my%20file.pdf`,
        expected: 'my file.pdf',
      },
      {
        name: 'reads an unquoted plain filename',
        header: 'attachment; filename=plain.pdf',
        expected: 'plain.pdf',
      },
      {
        name: 'strips the quotes from a quoted plain filename',
        header: 'attachment; filename="quoted file.pdf"',
        expected: 'quoted file.pdf',
      },
      {
        name: 'decodes a percent-encoded non-ASCII filename* value',
        header: `attachment; filename*=UTF-8''rapport%20%C3%A9t%C3%A9.pdf`,
        expected: 'rapport été.pdf',
      },
      {
        name: 'keeps a semicolon that belongs to a quoted filename',
        header: 'attachment; filename="draft; final.pdf"',
        expected: 'draft; final.pdf',
      },
      {
        name: 'falls back to the plain form when filename* is malformed',
        header: `attachment; filename="my file.pdf"; filename*=UTF-8''my%file.pdf`,
        expected: 'my file.pdf',
      },
      {
        name: 'keeps a malformed filename* raw when it is the only form sent',
        header: `attachment; filename*=UTF-8''my%file.pdf`,
        expected: 'my%file.pdf',
      },
      {
        name: 'keeps a malformed plain filename raw',
        header: 'attachment; filename="my%file.pdf"',
        expected: 'my%file.pdf',
      },
      {
        name: 'returns an empty name when the header carries no filename',
        header: 'attachment',
        expected: '',
      },
    ].forEach(({ name, header, expected }) => {
      test(name, () => {
        expect(el._filenameFromContentDisposition(header)).to.equal(expected);
      });
    });
  });
});
