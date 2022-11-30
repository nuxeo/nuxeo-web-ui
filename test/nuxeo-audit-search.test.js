/**
 @license
 (C) Copyright Nuxeo Corp. (http://nuxeo.com/)

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
  });
});
