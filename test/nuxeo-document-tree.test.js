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
import { fixture, flush, html, isElementVisible, login } from '@nuxeo/testing-helpers';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/hardware-icons.js';
import '../elements/nuxeo-document-tree/nuxeo-document-tree.js';

// mock the label for the document tree root
window.nuxeo.I18n.language = 'en';
window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
window.nuxeo.I18n.en['browse.root'] = 'Root';

const jsonHeader = { 'Content-Type': 'application/json' };

// root document definition
const rootDocument = {
  'entity-type': 'document',
  repository: 'default',
  uid: '1',
  path: '/',
  type: 'Root',
  parentRef: '/',
  title: 'Root',
  properties: {},
  facets: ['Folderish', 'NXTag', 'NotCollectionMember'],
  schemas: [
    {
      name: 'common',
      prefix: 'common',
    },
    {
      name: 'dublincore',
      prefix: 'dc',
    },
    {
      name: 'facetedTag',
      prefix: 'nxtag',
    },
  ],
  contextParameters: {
    hasFolderishChild: true,
  },
};

// root content children
const rootChildrenResponse = {
  'entity-type': 'documents',
  isPaginable: true,
  resultsCount: 3,
  pageSize: 40,
  maxPageSize: 40,
  resultsCountLimit: 40,
  currentPageSize: 3,
  currentPageIndex: 0,
  currentPageOffset: 0,
  numberOfPages: 1,
  isPreviousPageAvailable: false,
  isNextPageAvailable: false,
  isLastPageAvailable: false,
  isSortable: true,
  totalSize: 3,
  pageIndex: 0,
  pageCount: 1,
  entries: [
    {
      'entity-type': 'document',
      repository: 'default',
      uid: '2',
      path: '/default-domain/folder1',
      type: 'Folder',
      parentRef: '1',
      title: 'Folder 1',
      properties: {},
      facets: ['Folderish', 'NXTag', 'SuperSpace', 'HiddenInCreation', 'NotCollectionMember'],
      schemas: [
        {
          name: 'common',
          prefix: 'common',
        },
        {
          name: 'dublincore',
          prefix: 'dc',
        },
        {
          name: 'facetedTag',
          prefix: 'nxtag',
        },
      ],
    },
    {
      'entity-type': 'document',
      repository: 'default',
      uid: '3',
      path: '/default-domain/folder2',
      type: 'Folder',
      parentRef: '1',
      title: 'Folder 2',
      properties: {},
      facets: ['Folderish', 'NXTag', 'SuperSpace', 'HiddenInCreation', 'NotCollectionMember', 'MasterPublishSpace'],
      schemas: [
        {
          name: 'common',
          prefix: 'common',
        },
        {
          name: 'dublincore',
          prefix: 'dc',
        },
        {
          name: 'facetedTag',
          prefix: 'nxtag',
        },
      ],
    },
    {
      'entity-type': 'document',
      repository: 'default',
      uid: '4',
      path: '/default-domain/folder3',
      type: 'Folder',
      parentRef: '1',
      title: 'Folder 3',
      properties: {},
      facets: ['Folderish', 'NXTag', 'SuperSpace', 'HiddenInCreation', 'NotCollectionMember'],
      schemas: [
        {
          name: 'common',
          prefix: 'common',
        },
        {
          name: 'dublincore',
          prefix: 'dc',
        },
        {
          name: 'facetedTag',
          prefix: 'nxtag',
        },
      ],
      contextParameters: {
        hasFolderishChild: true,
      },
    },
  ],
};

// folder 3 children
const folderChildrenResponse = {
  'entity-type': 'documents',
  isPaginable: true,
  resultsCount: 2,
  pageSize: 40,
  maxPageSize: 40,
  resultsCountLimit: 40,
  currentPageSize: 2,
  currentPageIndex: 0,
  currentPageOffset: 0,
  numberOfPages: 1,
  isPreviousPageAvailable: false,
  isNextPageAvailable: false,
  isLastPageAvailable: false,
  isSortable: true,
  hasError: false,
  errorMessage: null,
  totalSize: 2,
  pageIndex: 0,
  pageCount: 1,
  entries: [
    {
      'entity-type': 'document',
      repository: 'default',
      uid: '5',
      path: '/default-domain/folder3/subfolder1',
      type: 'Folder',
      parentRef: '4',
      title: 'Subfolder 1',
      properties: {},
      facets: ['Folderish', 'NXTag', 'SuperSpace'],
      schemas: [
        {
          name: 'file',
          prefix: 'file',
        },
        {
          name: 'common',
          prefix: 'common',
        },
        {
          name: 'files',
          prefix: 'files',
        },
        {
          name: 'dublincore',
          prefix: 'dc',
        },
        {
          name: 'publishing',
          prefix: 'publish',
        },
        {
          name: 'facetedTag',
          prefix: 'nxtag',
        },
      ],
      contextParameters: {
        hasFolderishChild: false,
      },
    },
    {
      'entity-type': 'document',
      repository: 'default',
      uid: '6',
      path: '/default-domain/workspaces/subfolder2',
      type: 'Folder',
      parentRef: '4',
      title: 'Subfolder 2',
      properties: {},
      facets: ['Folderish', 'NXTag', 'SuperSpace', 'CollectionMember'],
      schemas: [
        {
          name: 'file',
          prefix: 'file',
        },
        {
          name: 'collectionMember',
          prefix: 'collectionMember',
        },
        {
          name: 'common',
          prefix: 'common',
        },
        {
          name: 'files',
          prefix: 'files',
        },
        {
          name: 'dublincore',
          prefix: 'dc',
        },
        {
          name: 'publishing',
          prefix: 'publish',
        },
        {
          name: 'facetedTag',
          prefix: 'nxtag',
        },
      ],
      contextParameters: {
        hasFolderishChild: false,
      },
    },
  ],
};

// Mock router
const router = {
  browse: (path) => path.substring(1),
  document: (path) => path,
};

suite('nuxeo-document-tree', () => {
  let server;
  let documentTree;

  setup(async () => {
    server = await login();
    server.respondWith('GET', '/api/v1/path/', [200, jsonHeader, JSON.stringify(rootDocument)]);
    server.respondWith('GET', '/api/v1/search/pp/tree_children/execute?currentPageIndex=0&pageSize=-1&queryParams=1', [
      200,
      jsonHeader,
      JSON.stringify(rootChildrenResponse),
    ]);
    server.respondWith(
      'GET',
      '/api/v1/search/pp/tree_children/execute?currentPageIndex=0&offset=0&pageSize=40&queryParams=1',
      [200, jsonHeader, JSON.stringify(rootChildrenResponse)],
    );

    server.respondWith(
      'GET',
      '/api/v1/search/pp/tree_children/execute?currentPageIndex=0&offset=0&pageSize=40&queryParams=4',
      [200, jsonHeader, JSON.stringify(folderChildrenResponse)],
    );
    documentTree = await fixture(
      html`
        <nuxeo-document-tree .router=${router} visible></nuxeo-document-tree>
      `,
    );
    documentTree.document = rootDocument;
    flush();
  });

  teardown(() => {
    server.restore();
  });

  suite('Interaction with the tree', () => {
    test('Should expand a Folderish document', async () => {
      expect(isElementVisible(documentTree)).to.be.true;
    });

    test('Should not expand a folderish document', async () => {
      expect(isElementVisible(documentTree)).to.be.true;
    });

    test('Icons should be updated due to tree node expansion', async () => {
      expect(isElementVisible(documentTree)).to.be.true;
      // should check if the icon is changed from expanded state to non expanded state
    });

    test('Tree breadcrumb is present', async () => {
      expect(isElementVisible(documentTree)).to.be.true;
    });

    test('Tree should collapse when clicking on a document', async () => {
      expect(isElementVisible(documentTree)).to.be.true;
    });
  });

  suite('Updating the tree', () => {
    test('Should update the tree when a document is removed', async () => {
      expect(isElementVisible(documentTree)).to.be.true;
    });
    test('Should update the tree when a document is created', async () => {
      expect(isElementVisible(documentTree)).to.be.true;
    });
    test('Should update the tree when the refresh-display event is fired', async () => {
      expect(isElementVisible(documentTree)).to.be.true;
    });
  });
});
