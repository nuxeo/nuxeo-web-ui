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
import {
  fixture,
  flush,
  html,
  isElementVisible,
  login,
  tap,
  waitForAttrMutation,
  waitForChildListMutation,
} from '@nuxeo/testing-helpers';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/hardware-icons.js';
import '../elements/nuxeo-document-tree/nuxeo-document-tree.js';

// mock the label for the document tree root
window.nuxeo.I18n.language = 'en';
window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
window.nuxeo.I18n.en['browse.root'] = 'Root';

const jsonHeader = { 'Content-Type': 'application/json' };

// generate a document for the tree
const generateDocument = ({ uid, type, parentRef, parentPath, isFolderish }) => {
  const doc = {
    'entity-type': 'document',
    repository: 'default',
    uid,
    path: type === 'Root' ? '/' : `/${parentPath}/${type}${uid}`,
    type,
    parentRef,
    title: type === 'Root' ? type : `${type}${uid}`,
    properties: {},
    facets: ['HiddenInCreation', 'NotCollectionMember'],
    schemas: [
      {
        name: 'common',
        prefix: 'common',
      },
      {
        name: 'dublincore',
        prefix: 'dc',
      },
    ],
    contextParameters: {
      hasFolderishChild: isFolderish,
    },
  };
  if (isFolderish) {
    doc.facets.push('Folderish');
  }
  return doc;
};

// generate the page provider response
const generatePageProviderResponse = (entries = []) => {
  return {
    'entity-type': 'documents',
    isPaginable: true,
    resultsCount: entries.length,
    pageSize: 40,
    maxPageSize: 40,
    resultsCountLimit: 40,
    currentPageSize: entries.length,
    currentPageIndex: 0,
    currentPageOffset: 0,
    numberOfPages: 1,
    isPreviousPageAvailable: false,
    isNextPageAvailable: false,
    isLastPageAvailable: false,
    isSortable: true,
    totalSize: entries,
    pageIndex: 0,
    pageCount: 1,
    entries,
  };
};

let rootDocument;
let levelOneDocuments;
let levelTwoDocuments;
let levelThreeDocuments;

/**
 * Mock router.
 * calling a global javascript function to prevent URL redirect.
 */
const router = {
  browse: (path) => `javascript:setLocationHref("${path.substring(1)}");`,
  document: (path) => `javascript:setLocationHref("${path}");`,
};

const getTreeRoot = (el) => el.$$('nuxeo-tree-node#root');
const getNodeLoadingSpinner = (el) => el.querySelector('paper-spinner');
const getTreeNodes = (el) => el.shadowRoot.querySelectorAll('nuxeo-tree-node');
const getTreeNodeByUid = (el, uid) => el.shadowRoot.querySelector(`nuxeo-tree-node[data-uid="${uid}"]`);

const waitForTreeNodeLoading = async (tree, node = null) => {
  const rootNode = node || getTreeRoot(tree);
  const spinner = getNodeLoadingSpinner(rootNode);
  expect(isElementVisible(rootNode)).to.be.true;
  if (rootNode.loading) {
    await waitForAttrMutation(spinner, 'active', null);
  }
  expect(isElementVisible(rootNode)).to.be.true;
  expect(rootNode.loading).to.be.false;
};

const getDocumentByPath = (path) => {
  let document;
  const parts = path.split('/');
  if (parts.length > 1) {
    document = levelOneDocuments.find((doc) => doc.title === parts[1]);
    expect(document).to.be.not.null;
    if (parts.length > 2) {
      document = levelTwoDocuments.find((doc) => doc.title === parts[2]);
      expect(document).to.be.not.null;
    }
    if (parts.length > 3) {
      document = levelThreeDocuments.find((doc) => doc.title === parts[3]);
      expect(document).to.be.not.null;
    }
  } else {
    document = rootDocument;
  }
  return document;
};

suite('nuxeo-document-tree', () => {
  let server;
  let documentTree;

  function setupDocuments() {
    // set up test documents
    rootDocument = generateDocument({ uid: 1, type: 'Root', parentRef: '/', parentPath: '', isFolderish: true });

    // document definition for: root -> documents
    levelOneDocuments = [
      generateDocument({ uid: '2', type: 'Folder', parentRef: '1', parentPath: '/', isFolderish: false }),
      generateDocument({ uid: '3', type: 'Note', parentRef: '1', parentPath: '/', isFolderish: false }),
      generateDocument({ uid: '4', type: 'Folder', parentRef: '1', parentPath: '/', isFolderish: true }),
    ];

    // document definition for: root -> documents -> documents
    levelTwoDocuments = [
      generateDocument({ uid: '5', type: 'File', parentRef: '4', parentPath: '/Folder4', isFolderish: false }),
      generateDocument({ uid: '6', type: 'Folder', parentRef: '4', parentPath: '/Folder4', isFolderish: true }),
    ];

    // document definition for: root -> documents -> documents -> documents
    levelThreeDocuments = [
      generateDocument({ uid: '7', type: 'File', parentRef: '6', parentPath: '/Folder6/Folder7', isFolderish: false }),
      generateDocument({ uid: '8', type: 'File', parentRef: '6', parentPath: '/Folder6/Folder8', isFolderish: false }),
    ];

    // set the breadcrumb for some documents
    levelTwoDocuments[1].contextParameters.breadcrumb = {
      'entity-type': 'documents',
      entries: [levelOneDocuments[2]],
    };

    levelThreeDocuments[0].contextParameters.breadcrumb = {
      'entity-type': 'documents',
      entries: [levelOneDocuments[2], levelTwoDocuments[1]],
    };
  }

  function setupServerResponses() {
    server.respondWith('GET', '/api/v1/path/', [200, jsonHeader, JSON.stringify(rootDocument)]);
    server.respondWith('GET', '/api/v1/search/pp/tree_children/execute?currentPageIndex=0&pageSize=-1&queryParams=1', [
      200,
      jsonHeader,
      JSON.stringify(generatePageProviderResponse(levelOneDocuments)),
    ]);
    server.respondWith(
      'GET',
      '/api/v1/search/pp/tree_children/execute?currentPageIndex=0&offset=0&pageSize=40&queryParams=1',
      [200, jsonHeader, JSON.stringify(generatePageProviderResponse(levelOneDocuments))],
    );
    server.respondWith(
      'GET',
      '/api/v1/search/pp/tree_children/execute?currentPageIndex=0&offset=0&pageSize=40&queryParams=4',
      [200, jsonHeader, JSON.stringify(generatePageProviderResponse(levelTwoDocuments))],
    );
    server.respondWith(
      'GET',
      '/api/v1/search/pp/tree_children/execute?currentPageIndex=0&offset=0&pageSize=40&queryParams=7',
      [200, jsonHeader, JSON.stringify(generatePageProviderResponse())],
    );
    server.respondWith(
      'GET',
      '/api/v1/search/pp/tree_children/execute?currentPageIndex=0&offset=0&pageSize=40&queryParams=6',
      [200, jsonHeader, JSON.stringify(generatePageProviderResponse(levelThreeDocuments))],
    );
    server.respondWith('GET', '/api/v1/path/Folder4', [200, jsonHeader, JSON.stringify(levelOneDocuments[2])]);
    server.respondWith('GET', '/api/v1/path/Folder4/Folder6', [200, jsonHeader, JSON.stringify(levelTwoDocuments[1])]);
  }

  setup(async () => {
    server = await login();
    setupDocuments();
    setupServerResponses();

    // create the document tree
    documentTree = await fixture(
      html`
        <nuxeo-document-tree .router=${router} visible></nuxeo-document-tree>
      `,
      true,
    );
    documentTree.document = rootDocument;
    await flush();
    // wait for the tree to finish loading
    await waitForTreeNodeLoading(documentTree);

    // assert that the nodes have been rendered
    const nodes = getTreeNodes(documentTree);
    assert.equal(nodes.length, 4, 'Tree nodes not loaded yet.');
    nodes.forEach((node) => {
      expect(isElementVisible(node)).to.be.true;
    });
  });

  teardown(() => {
    server.restore();
  });

  suite('Interaction with the tree', () => {
    test('Should expand a Folderish document with children', async () => {
      // get the node
      const node = getTreeNodeByUid(documentTree, '4');
      // check the node is not expanded
      expect(node.opened).to.be.false;
      // assert the node is folderish and we can open it, because the icon is visible
      const icon = node.querySelector('iron-icon');
      expect(isElementVisible(icon)).to.be.true;
      // tap to open the node
      tap(node.querySelector('iron-icon'));
      // node should now be opened
      expect(node.opened).to.be.true;
      await flush();
      await waitForTreeNodeLoading(documentTree, node);

      // assert that the node was opened and we have two new tree nodes
      const nodes = node.querySelectorAll('nuxeo-tree-node');
      assert.equal(nodes.length, 2);
    });

    test('Cannot expand a document without children', async () => {
      // get the node
      const node = getTreeNodeByUid(documentTree, '2');
      // check the node is not expanded
      expect(node.opened).to.be.false;
      // assert there's no icon to expand the node
      const icon = node.querySelector('iron-icon');
      expect(icon).to.be.null;
    });

    test('Icons should be updated due to tree node expansion', async () => {
      // get the node
      const node = getTreeNodeByUid(documentTree, '4');
      // assert the node is folderish and we can open it
      const icon = node.querySelector('iron-icon');
      const iconName = icon.icon;
      expect(isElementVisible(icon)).to.be.true;
      // check it is not expanded
      expect(node.opened).to.be.false;
      // icon name should not be empty
      expect(iconName).to.be.not.empty;
      // tap to open the node
      tap(node.querySelector('iron-icon'));
      // node should now be opened
      expect(node.opened).to.be.true;
      // icon should have been updated to something different
      const openedIcon = node.querySelector('iron-icon');
      expect(openedIcon.icon).to.be.not.empty;
      expect(iconName).to.be.not.equal(openedIcon.icon);
    });

    test('Tree breadcrumb is present', async () => {
      // set the new document that contains the breadcrumb
      const [doc] = levelThreeDocuments;
      documentTree.currentDocument = doc;
      await flush();
      await waitForChildListMutation(documentTree.$.tree);
      await waitForTreeNodeLoading(documentTree);

      // check that there are only three nodes (two children and the ancestor)
      const nodes = getTreeNodes(documentTree);
      expect(nodes).to.be.not.null;
      assert.equal(nodes.length, 3, 'Tree should have 3 nodes.');
      [...levelThreeDocuments, levelTwoDocuments[1]].forEach((document) => {
        const node = getTreeNodeByUid(documentTree, document.uid);
        expect(node).to.be.not.null;
        expect(isElementVisible(node)).to.be.true;
      });
      // assert that we have one parent only and it is visible
      expect(documentTree.parents).to.be.not.empty;
      assert.equal(documentTree.parents.length, 1);
      assert.equal(documentTree.parents[0].uid, '4');
      isElementVisible(documentTree.$$('.parents'));
    });

    test('Tree should collapse when clicking on a document', async () => {
      // XXX - add a function to call when clicking on a document and prevent browser redirect
      window.setLocationHref = (path) => {
        documentTree.currentDocument = getDocumentByPath(path);
      };

      // expand the nodes to reach the leaf (expanding two levels)
      let node = getTreeNodeByUid(documentTree, '4');
      tap(node.querySelector('iron-icon'));
      // node should now be opened
      expect(node.opened).to.be.true;
      await flush();
      await waitForTreeNodeLoading(documentTree, node);
      node = getTreeNodeByUid(documentTree, '6');
      tap(node.querySelector('iron-icon'));
      expect(node.opened).to.be.true;
      await flush();
      await waitForTreeNodeLoading(documentTree, node);

      // XXX - update the href to prevent redirect
      let nodes = getTreeNodes(documentTree);
      expect(nodes).to.be.not.null;
      assert.equal(nodes.length, 8, 'There are nodes missing in the tree.');
      nodes.forEach((n) => {
        const anchor = n.querySelector('.node-name a');
        anchor.setAttribute('href', anchor.href.substring(anchor.href.indexOf('javascript'), anchor.href.length));
      });
      const nodeToClick = getTreeNodeByUid(documentTree, '7');
      expect(nodeToClick).to.be.not.null;
      // click the anchor
      nodeToClick.querySelector('a').click();

      await flush();
      await waitForChildListMutation(documentTree.$.tree);
      await waitForTreeNodeLoading(documentTree);

      // check that there are only three nodes (two children and the ancestor)
      nodes = getTreeNodes(documentTree);
      expect(nodes).to.be.not.null;
      assert.equal(nodes.length, 3, 'Tree should have 3 nodes.');
      [...levelThreeDocuments, levelTwoDocuments[1]].forEach((document) => {
        const n = getTreeNodeByUid(documentTree, document.uid);
        expect(n).to.be.not.null;
        expect(isElementVisible(n)).to.be.true;
      });
      // assert that we have one parent only and it is visible
      expect(documentTree.parents).to.be.not.empty;
      assert.equal(documentTree.parents.length, 1);
      assert.equal(documentTree.parents[0].uid, '4');
      isElementVisible(documentTree.$$('.parents'));
    });
  });

  suite('Updating the tree', () => {
    test('Should update the tree when a document is removed', async () => {
      // fire the event to remove the documents from the tree
      const documentsToDelete = levelOneDocuments.slice(0, 2);
      window.dispatchEvent(
        new CustomEvent('nuxeo-documents-deleted', {
          detail: {
            documents: documentsToDelete,
          },
        }),
      );
      await flush();
      await waitForTreeNodeLoading(documentTree);

      // assert that the nodes were correctly removed
      const nodes = getTreeNodes(documentTree);
      assert.equal(nodes.length, 2, 'Nodes were not removed from the tree.');
      documentsToDelete.forEach((document) => {
        const nonExistentNode = getTreeNodeByUid(documentTree, document.uid);
        expect(nonExistentNode).to.be.null;
      });
    });

    test('Should update the tree when a document is created', async () => {
      // the newly created document
      const document = generateDocument({
        uid: '9',
        type: 'Folder',
        parentRef: '1',
        parentPath: '/',
        isFolderish: false,
      });
      levelOneDocuments.push(document);
      // update the results to return the newly created document
      const response = generatePageProviderResponse(levelOneDocuments);
      // override the response to retrieve the newly create document
      server.respondWith(
        'GET',
        '/api/v1/search/pp/tree_children/execute?currentPageIndex=0&offset=0&pageSize=40&queryParams=1',
        [200, jsonHeader, JSON.stringify(response)],
      );

      // dispatch the document-created event to update the tree
      window.dispatchEvent(new CustomEvent('document-created'));
      await flush();
      await waitForChildListMutation(documentTree.$.tree);
      await waitForTreeNodeLoading(documentTree);

      // assert that we have an extra node in the tree and it is the correct one
      const nodes = getTreeNodes(documentTree);
      assert.equal(nodes.length, 5, 'Nodes were not correctly added to the tree.');
      const node = getTreeNodeByUid(documentTree, document.uid);
      expect(node).to.be.not.null;
      expect(isElementVisible(node)).to.be.true;
    });

    test('Should update the tree when the refresh-display event is fired', async () => {
      // set a new title a document to validate the refresh-display updates the tree
      const title = 'New doc title';
      levelOneDocuments[0].title = title;
      // override the response to retrieve the updated document
      const response = generatePageProviderResponse(levelOneDocuments);
      server.respondWith(
        'GET',
        '/api/v1/search/pp/tree_children/execute?currentPageIndex=0&offset=0&pageSize=40&queryParams=1',
        [200, jsonHeader, JSON.stringify(response)],
      );

      // dispatch the refresh-display event
      window.dispatchEvent(new CustomEvent('refresh-display'));
      await flush();
      await waitForChildListMutation(documentTree.$.tree);
      await waitForTreeNodeLoading(documentTree);

      // check we still have all the tree nodes
      const nodes = getTreeNodes(documentTree);
      assert.equal(nodes.length, 4, 'There are missing nodes in the tree.');
      // assert the node has the updated title
      const node = Array.from(nodes).find((n) => n.data.title === title);
      expect(node).to.be.not.null;
      assert.equal(node.querySelector('.node-name').textContent.trim(), title);
    });
  });
});
