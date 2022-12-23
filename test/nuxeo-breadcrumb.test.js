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
import { fixture, html, isElementVisible, login, flush } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-browser/nuxeo-breadcrumb.js';

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
  uid: '7ertyyy-hdjkdks-874fghd',
};

// Mock router
const router = {
  browse: (path) => path.substring(1),
};

suite('nuxeo-breadcrumb', () => {
  let server;
  let breadcrumb;

  setup(async () => {
    server = await login();
    breadcrumb = await fixture(
      html`
        <nuxeo-breadcrumb .document=${document} .router=${router}></nuxeo-breadcrumb>
      `,
    );
  });

  teardown(() => {
    server.restore();
  });

  suite('Visibility', () => {
    test('Should display the document title when a document is set and has a title', async () => {
      const title = breadcrumb.shadowRoot.querySelector('.current');
      expect(isElementVisible(title)).to.be.true;
      expect(title.innerText).to.equal('my file');
    });

    test('Should display the document uid when a document is set and has a title and has a UID', async () => {
      const uid = breadcrumb.shadowRoot.querySelector('.doc-uid');
      expect(isElementVisible(uid)).to.be.true;
      expect(uid.innerText).to.equal('(874fghd)');
    });

    test('Should display trash icon beside the document title when a document is trashed', async () => {
      const trashDocument = {
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
        uid: '7ertyyy-hdjkdks-874fghd',
        isTrashed: true,
      };
      breadcrumb.set('document', trashDocument);
      await flush();
      const trashIcon = breadcrumb.shadowRoot.querySelector('.trash-icon-parent');

      expect(isElementVisible(trashIcon)).to.be.true;
    });

    test('Should not display trash icon beside the document title when a document is not trashed', async () => {
      const trashDocument = {
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
        uid: '7ertyyy-hdjkdks-874fghd',
        isTrashed: false,
      };
      breadcrumb.set('document', trashDocument);
      await flush();
      const trashIcon = breadcrumb.shadowRoot.querySelector('.trash-icon-parent');

      expect(isElementVisible(trashIcon)).to.be.false;
    });

    test('Should display a breadcrumb when a document is set', async () => {
      expect(isElementVisible(breadcrumb)).to.be.true;
    });
  });

  suite('Breadcrumb composition', () => {
    test('Should display all the ancestors except the last one when document has breadcrumb entries', async () => {
      const ancestors = breadcrumb.shadowRoot.querySelector('#ancestors');
      expect(isElementVisible(ancestors)).to.be.true;
      expect(ancestors.childElementCount).to.equal(6);
      ancestors.childNodes.forEach((ancestor, index) => {
        expect(ancestor.firstChild.innerText).to.equal(document.contextParameters.breadcrumb.entries[index].title);
      });
    });

    test('Should display separators after first ancestor when document has breadcrumb entries', async () => {
      const ancestors = breadcrumb.shadowRoot.querySelector('#ancestors');
      let separators = 0;
      for (let index = 1; index < ancestors.childNodes.length; index++) {
        const separator = window.getComputedStyle(ancestors.childNodes[index], ':before').getPropertyValue('content');
        separators++;
        expect(separator).to.equal('" > "');
      }
      expect(separators).to.equal(5);
    });

    test('Should set links in ancestors when document has breadcrumb entries', async () => {
      const ancestors = breadcrumb.shadowRoot.querySelector('#ancestors');
      ancestors.childNodes.forEach((ancestor, index) => {
        const breadcrumbEntries = document.contextParameters.breadcrumb.entries[index].path;
        expect(ancestor.firstChild.getAttribute('href')).to.equal(breadcrumbEntries);
      });
    });
  });

  suite('Space adjustment', () => {
    setup(async () => {
      breadcrumb = await fixture(
        html`
          <div id="container" style="max-width: 200px">
            <nuxeo-breadcrumb .document=${document} .router=${router}></nuxeo-breadcrumb>
          </div>
        `,
      );
    });

    test('Should add ellipsis to ancestors when parent is smaller than nuxeo-breadcrumb', async () => {
      const nuxeoBreadcrumb = breadcrumb.querySelector('nuxeo-breadcrumb');
      expect(isElementVisible(nuxeoBreadcrumb)).to.be.true;
      const ancestors = nuxeoBreadcrumb.shadowRoot.querySelector('#ancestors');
      const ellipsis = ancestors.firstElementChild.querySelector('#ellipsis').innerText;
      expect(ellipsis).to.equal('...');
    });

    test('Should remove ancestors when parent size is smaller than nuxeo-breadcrumb', async () => {
      const nuxeoBreadcrumb = breadcrumb.querySelector('nuxeo-breadcrumb');
      expect(isElementVisible(nuxeoBreadcrumb)).to.be.true;
      const ancestors = nuxeoBreadcrumb.shadowRoot.querySelector('#ancestors');
      expect(ancestors.childElementCount).to.be.below(6);
    });
  });
});
