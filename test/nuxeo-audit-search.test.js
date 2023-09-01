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
import '../elements/nuxeo-audit/nuxeo-audit-search.js';

const document = {
  'entity-type': 'document',
  contextParameters: {
    breadcrumb: {
      entries: [
        {
          path: '/default-domain',
          title: 'Domain',
          type: 'Domain',
          uid: '1',
        },
        {
          path: '/default-domain/workspaces',
          title: 'Workspaces',
          type: 'WorkspaceRoot',
          uid: '2',
        },
        {
          path: '/default-domain/workspaces/my workspace',
          title: 'my workspace',
          type: 'Workspace',
          uid: '3',
        },
        {
          path: '/default-domain/workspaces/my workspace/folder 1',
          title: 'folder 1',
          type: 'Folder',
          uid: '4',
        },
        {
          path: '/default-domain/workspaces/my workspace/folder 1/folder 2',
          title: 'folder 2',
          type: 'Folder',
          uid: '5',
        },
        {
          path: '/default-domain/workspaces/my workspace/folder 1/folder 2/folder 3',
          title: 'folder 3',
          type: 'Folder',
          uid: '6',
        },
        {
          path: '/default-domain/workspaces/my workspace/folder 1/folder 2/folder 3/my file',
          title: 'my file',
          type: 'File',
          uid: '7',
        },
      ],
    },
  },
  path: '/default-domain/workspaces/my workspace/folder 1/folder 2/folder 3/my file',
  title: 'my file',
  type: 'File',
  uid: '7',
};

// mock the label for the document tree root
window.nuxeo.I18n.language = 'en';
window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
window.nuxeo.I18n.en['command.view'] = 'View';

suite('nuxeo-audit-search', () => {
  let element;
  let server;

  setup(async () => {
    server = await login();
    element = await fixture(
      html`
        <nuxeo-audit-search name="document-history" id="document-history" .document=${document}"> </nuxeo-audit-search>
      `,
    );
  });

  teardown(() => {
    server.restore();
  });

  suite('format comment', () => {
    test('Should return the text View to identify type of download alongwith file name', () => {
      sinon.spy(element, '_formatComment');
      expect(element._formatComment('file1.jpeg', 'view')).to.equal('View: [file1.jpeg]');
    });
    test('Should return the comment only', () => {
      sinon.spy(element, '_formatComment');
      expect(element._formatComment('file1.jpeg', '')).to.equal('file1.jpeg');
    });
    test('Should return the formatted date when date is passed as comment', () => {
      sinon.spy(element, '_formatComment');
      expect(element._formatComment('2022-12-16T08:38:12.665Z', '')).to.equal('December 16, 2022 8:38 AM');
    });
  });
  suite('build params', () => {
    test('Should return document id when document and uid is present', () => {
      element.events = ['abc'];
      element.document = {
        uid: '123',
      };
      element.category = 'test';
      element.startDate = '2022-12-16T08:38:12.665Z';
      element.endDate = '2022-12-15T08:38:12.665Z';
      sinon.spy(element, '_formatComment');
      element.visible = true;
      expect(element.documentId).to.equal(element.document.uid);
    });
    test('Should return empty document id when document is not present', () => {
      element.events = ['abc'];
      element.document = null;
      sinon.spy(element, '_formatComment');
      element.visible = true;
      expect(element.documentId).to.equal('');
    });
    test('Should return the text View to identify type of download alongwith file name', () => {
      sinon.spy(element, '_formatComment');
      element.visible = true;
      expect(element._buildParams().principalName).to.equal('');
    });
  });
  suite('get document url', () => {
    test('Should not return when docUUID is not present', () => {
      const item = {
        properties: {
          'file:content': {
            appLinks: [],
            downloadUrl: null,
            data: 'abc.docx?changeToken=1-0',
            digest: '2e7d1a1ba7018c048bebdf1d07481ee3',
            digestAlgorithm: 'MD5',
            encoding: null,
            length: '5763',
            'mime-type': 'image/jpeg',
            name: 'kitten1 (4).jpeg',
          },
        },
      };
      expect(element._getDocumentURL(item)).to.be.undefined;
    });
  });
  suite('parse comment', () => {
    test('Should not parse when properties are not set', () => {
      expect(element._parseComment('file1.jpeg')).to.be.null;
    });
  });
  suite('format document', () => {
    test('Should not format when properties are not set', () => {
      const item = {
        properties: {
          'file:content': {
            appLinks: [],
            downloadUrl: null,
            data: 'abc.docx?changeToken=1-0',
            digest: '2e7d1a1ba7018c048bebdf1d07481ee3',
            digestAlgorithm: 'MD5',
            encoding: null,
            length: '5763',
            'mime-type': 'image/jpeg',
            name: 'kitten1 (4).jpeg',
          },
        },
      };
      expect(element._formatDocument(item)).to.equal('');
      expect(element._formatDocument()).to.be.undefined;
    });
  });
  suite('format i18n', () => {
    test('Should return concat when key is present', () => {
      expect(element._formati18n('audit', 1)).to.equal('audit1');
    });
    test('Should not return when key is not present', () => {
      expect(element._formati18n('audit')).to.equal('');
    });
  });
});
