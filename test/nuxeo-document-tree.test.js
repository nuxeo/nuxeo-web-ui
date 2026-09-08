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
import { fixture, flush, html, isElementVisible, login, tap, waitForChildListMutation } from '@nuxeo/testing-helpers';
import '@nuxeo/nuxeo-ui-elements/nuxeo-icons.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/hardware-icons.js';
import '../elements/nuxeo-document-tree/nuxeo-document-tree.js';

let rootDocument;
let levelOneDocuments;
let levelTwoDocuments;
let levelThreeDocuments;
let levelFourDocuments;
let levelOneDocument;
let levelTwoDocument;
let uidCounter;

// mock the label for the document tree root
window.nuxeo.I18n.language = 'en';
window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
window.nuxeo.I18n.en['browse.root'] = 'Root';

const jsonHeader = { 'Content-Type': 'application/json' };

// generate a document for the tree
const generateDocument = ({ type, parentRef, parentPath, isFolderish }) => {
  const uid = uidCounter++;
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
    totalSize: entries.length,
    pageIndex: 0,
    pageCount: 1,
    entries,
  };
};

/**
 * Mock router.
 * calling a global javascript function to prevent URL redirect.
 */
const router = {
  browse: (path) => path.substring(1),
  document: (path) => path,
};

const getTreeRoot = (el) => el.$$('nuxeo-tree-node#root');
const getNodeLoadingSpinner = (el) => el.querySelector('paper-spinner');
const getTreeNodes = (el) => el.shadowRoot.querySelectorAll('nuxeo-tree-node');
const getTreeNodeByUid = (el, uid) => el.shadowRoot.querySelector(`nuxeo-tree-node[data-uid="${uid}"]`);

const waitForTreeNodeLoading = async (tree, node = null) => {
  const rootNode = node || getTreeRoot(tree);
  const spinner = getNodeLoadingSpinner(rootNode);
  if (isElementVisible(rootNode) && rootNode.loading && !spinner.getAttribute('active')) {
    await waitForChildListMutation(rootNode.querySelector('#children'));
  }
};

/**
 * Polls a predicate until it returns truthy or times out.
 *
 * The tree is populated through multiple chained XHRs (sinon's fakeServer
 * defaults to a 10 ms autoRespond timer per request). On slower CI runners
 * each response can produce its own MutationObserver batch, so a single
 * `waitForChildListMutation` call only catches the first batch and the
 * subsequent assertions race against the remaining updates. Polling until
 * the expected state is reached makes these assertions deterministic.
 */
const waitForCondition = async (predicate, { timeout = 5000, interval = 25 } = {}) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  if (!(await predicate())) {
    throw new Error(`waitForCondition: timed out after ${timeout}ms`);
  }
};

const waitForTreeNodeCount = (tree, expected, options) =>
  waitForCondition(() => getTreeNodes(tree).length === expected, options);

const getDocumentByPath = (path) => {
  let document;
  const parts = path.split('/');
  if (parts.length > 1) {
    document = levelOneDocuments.find((doc) => doc.title === parts[1]);
    if (parts.length > 2) {
      document = levelTwoDocuments.find((doc) => doc.title === parts[2]);
    }
    if (parts.length > 3) {
      document = levelThreeDocuments.find((doc) => doc.title === parts[3]);
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
    uidCounter = 1;
    // set up test documents
    rootDocument = generateDocument({ type: 'Root', parentRef: '/', parentPath: '', isFolderish: true });

    // document definition for: root -> documents
    levelOneDocuments = [
      generateDocument({ type: 'Folder', parentRef: '1', parentPath: '/', isFolderish: false }),
      generateDocument({ type: 'Note', parentRef: '1', parentPath: '/', isFolderish: false }),
      generateDocument({ type: 'Folder', parentRef: '1', parentPath: '/', isFolderish: true }),
    ];
    // eslint-disable-next-line prefer-destructuring
    levelOneDocument = levelOneDocuments[2];

    // document definition for: root -> documents -> documents
    levelTwoDocuments = [
      generateDocument({ type: 'File', parentRef: '4', parentPath: '/Folder4', isFolderish: false }),
      generateDocument({ type: 'Folder', parentRef: '4', parentPath: '/Folder4', isFolderish: true }),
    ];
    // eslint-disable-next-line prefer-destructuring
    levelTwoDocument = levelTwoDocuments[1];

    // document definition for: root -> documents -> documents -> documents
    levelThreeDocuments = [
      generateDocument({ type: 'File', parentRef: '6', parentPath: '/Folder6/Folder7', isFolderish: false }),
      generateDocument({ type: 'File', parentRef: '6', parentPath: '/Folder6/Folder8', isFolderish: false }),
    ];

    // set the breadcrumb for some documents
    levelTwoDocument.contextParameters.breadcrumb = {
      'entity-type': 'documents',
      entries: [levelOneDocument, JSON.parse(JSON.stringify(levelTwoDocument))],
    };

    levelThreeDocuments[0].contextParameters.breadcrumb = {
      'entity-type': 'documents',
      entries: [levelOneDocument, levelTwoDocument],
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
    server.respondWith('GET', '/api/v1/path/Folder4', [200, jsonHeader, JSON.stringify(levelOneDocument)]);
    server.respondWith('GET', '/api/v1/path/Folder4/Folder6', [200, jsonHeader, JSON.stringify(levelTwoDocument)]);
  }

  async function setupFixture() {
    // create the document tree
    documentTree = await fixture(
      html` <nuxeo-document-tree .router=${router} .document=${rootDocument} visible></nuxeo-document-tree> `,
      true,
    );
    await flush();
    // wait for the tree to finish loading
    await waitForTreeNodeLoading(documentTree);
    const node = getTreeRoot(documentTree);
    await waitForTreeNodeLoading(documentTree, node);
  }

  setup(async () => {
    server = await login();
    setupDocuments();
    setupServerResponses();
  });

  teardown(() => {
    server.restore();
  });

  suite('Interaction with the tree', () => {
    setup(async () => setupFixture());

    test('Should expand a Folderish document with children', async () => {
      // get the node
      const node = getTreeNodeByUid(documentTree, 4);
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
      expect(nodes).to.have.length(2);
    });

    test('Cannot expand a document without children', async () => {
      // get the node
      const node = getTreeNodeByUid(documentTree, '2');
      // check the node is not expanded
      expect(node.opened).to.be.false;
      // assert there's no icon to expand the node
      const icon = node.querySelector('iron-icon');
      expect(icon).to.be.null;
      expect(documentTree._icon(false)).to.be.equal('icons:folder');
      expect(documentTree._icon(true)).to.be.equal('icons:folder-open');
      expect(documentTree._loading(false)).to.be.equal('');
      expect(documentTree._documentChanged()).to.be.undefined;
    });

    test('Icons should be updated due to tree node expansion', async () => {
      // get the node
      const node = getTreeNodeByUid(documentTree, 4);
      // assert the node is folderish and we can open it
      const icon = node.querySelector('iron-icon');
      let iconName = icon.icon;
      expect(isElementVisible(icon)).to.be.true;
      expect(iconName).to.be.equal('hardware:keyboard-arrow-right');
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
      iconName = openedIcon.icon;
      expect(iconName).to.be.not.empty;
      expect(iconName).to.be.equal('hardware:keyboard-arrow-down');
    });

    test('Tree breadcrumb is present', async () => {
      // set the new document that contains the breadcrumb
      const [doc] = levelThreeDocuments;
      documentTree.currentDocument = doc;
      await flush();
      await waitForChildListMutation(documentTree.$.tree);
      await waitForTreeNodeLoading(documentTree);
      // tree population requires multiple chained XHRs; wait until the
      // expected node count is reached before asserting on it
      await waitForTreeNodeCount(documentTree, 3);

      // check that there are only three nodes (two children and the ancestor)
      const nodes = getTreeNodes(documentTree);
      expect(nodes).to.be.not.null;
      expect(nodes).to.have.length(3);
      [...levelThreeDocuments, levelTwoDocument].forEach((document) => {
        const node = getTreeNodeByUid(documentTree, document.uid);
        expect(node).to.be.not.null;
        expect(isElementVisible(node)).to.be.true;
      });
      // assert that we have one parent only and it is visible
      expect(documentTree.parents).to.be.not.empty;
      expect(documentTree.parents).to.have.length(1);
      expect(documentTree.parents[0].uid).to.be.equal(4);
      isElementVisible(documentTree.shadowRoot.querySelector('.parents'));
    });

    test('Tree breadcrumb is present with root document', async () => {
      // set the new document that contains the breadcrumb

      levelFourDocuments = [
        generateDocument({ type: 'Root', parentRef: '7', parentPath: '/Folder6/Folder7', isFolderish: false }),
        generateDocument({ type: 'File', parentRef: '8', parentPath: '/Folder6/Folder8', isFolderish: false }),
      ];
      const [doc] = levelFourDocuments;
      documentTree.currentDocument = doc;
      await flush();
      await waitForChildListMutation(documentTree.$.tree);
      await waitForTreeNodeLoading(documentTree);
      await waitForTreeNodeCount(documentTree, 4);

      const nodes = getTreeNodes(documentTree);
      expect(nodes).to.have.length(4);
    });

    test('Tree should collapse when clicking on a document', async () => {
      // expand the nodes to reach the leaf (expanding two levels)
      let node = getTreeNodeByUid(documentTree, 4);
      tap(node.querySelector('iron-icon'));
      // node should now be opened
      expect(node.opened).to.be.true;
      await flush();
      await waitForTreeNodeLoading(documentTree);
      await waitForTreeNodeLoading(documentTree, node);

      node = getTreeNodeByUid(documentTree, 6);
      tap(node.querySelector('iron-icon'));
      expect(node.opened).to.be.true;
      await flush();
      await waitForTreeNodeLoading(documentTree);
      node = getTreeNodeByUid(documentTree, 6);
      await waitForTreeNodeLoading(documentTree, node);

      // add an event listener to intercept the click event and prevent url redirect
      let nodes = getTreeNodes(documentTree);
      expect(nodes).to.be.not.null;
      expect(nodes).to.have.length(8);
      nodes.forEach((n) => {
        const anchor = n.querySelector('.node-name a');
        anchor.addEventListener('click', (ev) => {
          ev.preventDefault();
          documentTree.currentDocument = getDocumentByPath(new URL(ev.target.href).pathname);
        });
      });
      node = getTreeNodeByUid(documentTree, 6);
      expect(node).to.be.not.null;
      // click the anchor
      tap(node.querySelector('a'));
      await flush();
      await waitForTreeNodeLoading(documentTree);
      await waitForChildListMutation(documentTree.$.tree);
      node = getTreeNodeByUid(documentTree, 6);
      expect(node).to.be.not.null;
      expect(node.opened).to.be.true;
      await waitForTreeNodeLoading(documentTree, node);
      await waitForTreeNodeCount(documentTree, 3);

      // check that there are only three nodes (two children and the ancestor)
      nodes = getTreeNodes(documentTree);
      expect(nodes).to.be.not.null;
      expect(nodes).to.have.length(3);
      [...levelThreeDocuments, levelTwoDocument].forEach((document) => {
        const n = getTreeNodeByUid(documentTree, document.uid);
        expect(n).to.be.not.null;
        expect(isElementVisible(n)).to.be.true;
      });
      // assert that we have one parent only and it is visible
      expect(documentTree.parents).to.be.not.empty;
      expect(documentTree.parents).to.have.length(1);
      expect(documentTree.parents[0].uid).to.be.equal(4);
      expect(isElementVisible(documentTree.shadowRoot.querySelector('.parents')));
    });
  });

  // WEBUI-1877: the row is the disclosure control, so it owns the expanded state and the focus;
  // the arrow inside it is decorative and must stay out of the accessibility tree.
  suite('Tree row disclosure accessibility', () => {
    setup(async () => setupFixture());

    const treeItemOf = (node) => node.querySelector('[role="treeitem"]');

    const leafNode = () => {
      const leaf = Array.from(getTreeNodes(documentTree)).find((node) => !node.querySelector('iron-icon[toggle]'));
      expect(leaf, 'fixture should contain a leaf node').to.be.ok;
      return leaf;
    };

    test('The row reports its expanded state', async () => {
      const node = getTreeNodeByUid(documentTree, 4);
      expect(treeItemOf(node).getAttribute('aria-expanded')).to.equal('false');
      tap(node.querySelector('iron-icon'));
      await flush();
      expect(treeItemOf(node).getAttribute('aria-expanded')).to.equal('true');
    });

    // The arrow duplicated the row's state and name, so screen readers announced each toggle twice.
    test('The arrow is decorative and carries no state of its own', () => {
      const icon = getTreeNodeByUid(documentTree, 4).querySelector('iron-icon');
      expect(icon.getAttribute('aria-hidden')).to.equal('true');
      expect(icon.hasAttribute('aria-expanded')).to.be.false;
      expect(icon.hasAttribute('aria-label')).to.be.false;
      // An aria-hidden node must not be reachable by keyboard.
      expect(icon.hasAttribute('tabindex')).to.be.false;
    });

    test('Expandable rows take the focus and leaves do not', () => {
      const expandable = getTreeNodeByUid(documentTree, 4);
      expect(treeItemOf(expandable).getAttribute('tabindex')).to.equal('0');
      const leaf = leafNode();
      expect(treeItemOf(leaf).hasAttribute('tabindex')).to.be.false;
    });

    // aria-expanded on an end node announces it as collapsed but expandable, which is the same
    // wrong state this ticket is fixing elsewhere; the treeview pattern forbids it on leaves.
    test('Leaf rows carry no expanded state', () => {
      expect(treeItemOf(leafNode()).hasAttribute('aria-expanded')).to.be.false;
    });

    // "collapsed" on its own does not tell the listener the row can be opened, so expandable rows
    // are described by a hint that does.
    test('Expandable rows are described by the toggle hint and leaves are not', () => {
      const expandable = getTreeNodeByUid(documentTree, 4);
      expect(treeItemOf(expandable).getAttribute('aria-describedby')).to.equal('toggleHint');
      expect(treeItemOf(leafNode()).hasAttribute('aria-describedby')).to.be.false;
    });

    test('The hint resolves to a translated string the row can reference', () => {
      const hint = documentTree.shadowRoot.querySelector('#toggleHint');
      expect(hint, 'the hint node must exist for aria-describedby to resolve').to.be.ok;
      // Same shadow root as the rows, otherwise the IDREF would not resolve.
      expect(treeItemOf(getTreeNodeByUid(documentTree, 4)).getRootNode()).to.equal(hint.getRootNode());
      const text = hint.textContent.trim();
      expect(text).to.not.be.empty;
      expect(text).to.not.equal('browse.tree.toggleHint');
    });

    test('_toggleHintId only describes expandable rows', () => {
      expect(documentTree._toggleHintId(false)).to.equal('toggleHint');
      expect(documentTree._toggleHintId(true)).to.be.undefined;
    });

    test('Enter expands the node and announces the new state', async () => {
      const node = getTreeNodeByUid(documentTree, 4);
      const toggled = sinon.spy();
      documentTree.addEventListener('tree-node-toggled', toggled);
      treeItemOf(node).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await flush();
      expect(node.opened).to.be.true;
      expect(treeItemOf(node).getAttribute('aria-expanded')).to.equal('true');
      expect(toggled).to.have.been.calledOnce;
      expect(toggled.firstCall.args[0].detail.expanded).to.be.true;
    });

    test('Space toggles the row as well', async () => {
      const node = getTreeNodeByUid(documentTree, 4);
      treeItemOf(node).dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      await flush();
      expect(node.opened).to.be.true;
    });

    // The row and the link it contains are both keyboard reachable, so the row handler has to keep
    // its hands off Enter once focus has moved on to the link.
    test('Enter on the document link navigates instead of toggling', async () => {
      const node = getTreeNodeByUid(documentTree, 4);
      const toggled = sinon.spy();
      documentTree.addEventListener('tree-node-toggled', toggled);
      node.querySelector('a').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await flush();
      expect(node.opened).to.be.false;
      expect(toggled).to.not.have.been.called;
    });

    test('ArrowDown is left to tree navigation and does not toggle', async () => {
      const node = getTreeNodeByUid(documentTree, 4);
      const toggled = sinon.spy();
      documentTree.addEventListener('tree-node-toggled', toggled);
      treeItemOf(node).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await flush();
      expect(node.opened).to.be.false;
      expect(toggled).to.not.have.been.called;
    });

    test('A row with no arrow ignores Enter', async () => {
      const node = getTreeNodeByUid(documentTree, 4);
      const item = treeItemOf(node);
      const icon = node.querySelector('iron-icon');
      icon.removeAttribute('toggle');
      const toggled = sinon.spy();
      documentTree.addEventListener('tree-node-toggled', toggled);
      item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await flush();
      expect(toggled).to.not.have.been.called;
      icon.setAttribute('toggle', '');
    });

    test('_ariaExpanded stringifies the state and skips leaves', () => {
      expect(documentTree._ariaExpanded(true, false)).to.equal('true');
      expect(documentTree._ariaExpanded(false, false)).to.equal('false');
      expect(documentTree._ariaExpanded(undefined, false)).to.equal('false');
      // undefined makes Polymer drop the attribute rather than serialize a value.
      expect(documentTree._ariaExpanded(false, true)).to.be.undefined;
      expect(documentTree._ariaExpanded(true, true)).to.be.undefined;
    });

    test('_treeItemTabIndex only makes expandable rows focusable', () => {
      expect(documentTree._treeItemTabIndex(false)).to.equal('0');
      expect(documentTree._treeItemTabIndex(true)).to.be.undefined;
    });
  });

  suite('Updating the tree', () => {
    setup(async () => setupFixture());

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
      expect(nodes).to.have.length(2);
      documentsToDelete.forEach((document) => {
        const nonExistentNode = getTreeNodeByUid(documentTree, document.uid);
        expect(nonExistentNode).to.be.null;
      });
    });

    test('Should not remove document when documents to be deleted are not present', async () => {
      // fire the event to remove the documents from the tree
      const documentsToDelete = null;
      window.dispatchEvent(
        new CustomEvent('nuxeo-documents-deleted', {
          detail: {
            documents: documentsToDelete,
          },
        }),
      );
      await flush();
      await waitForTreeNodeLoading(documentTree);

      // assert that the documents are not removed
      const nodes = getTreeNodes(documentTree);
      expect(nodes).to.have.length(4);
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
      await waitForTreeNodeCount(documentTree, 5);

      // assert that we have an extra node in the tree and it is the correct one
      const nodes = getTreeNodes(documentTree);
      expect(nodes).to.have.length(5);
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
      await waitForTreeNodeCount(documentTree, 4);

      // check we still have all the tree nodes
      const nodes = getTreeNodes(documentTree);
      expect(nodes).to.have.length(4);
      // assert the node has the updated title
      const node = Array.from(nodes).find((n) => n.data.title === title);
      expect(node).to.be.not.null;
      expect(node.querySelector('.node-name').textContent.trim()).to.be.equal(title);
    });

    test('When server responded with 403', async () => {
      // set a new title a document to validate the refresh-display updates the tree
      const title = 'New doc title';
      levelOneDocuments[0].title = title;
      // override the response to retrieve the updated document
      generatePageProviderResponse(levelOneDocuments);
      server.respondWith('GET', '/api/v1/path/Folder4/Folder6', [403, jsonHeader, JSON.stringify(levelTwoDocument)]);

      // dispatch the refresh-display event
      window.dispatchEvent(new CustomEvent('refresh-display'));
      await flush();
      await waitForChildListMutation(documentTree.$.tree);
      await waitForTreeNodeLoading(documentTree);
      await waitForTreeNodeCount(documentTree, 4);

      // check we still have all the tree nodes
      const nodes = getTreeNodes(documentTree);
      expect(nodes).to.have.length(4);
      // assert the node has the updated title
      const node = Array.from(nodes).find((n) => n.data.title === title);
      expect(node).to.be.undefined;
    });
  });
});
