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
import '@webcomponents/html-imports/html-imports.min.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import { fixture, html, flush, waitForEvent, isElementVisible } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-document-actions/nuxeo-document-parent-inspector-button.js';

const waitForDialogOpen = async (dialog) => {
  if (!isElementVisible(dialog)) {
    await waitForEvent(dialog, 'iron-overlay-opened');
    await flush();
  }
};

const waitForDialogClose = async (dialog) => {
  if (isElementVisible(dialog)) {
    await waitForEvent(dialog, 'iron-overlay-closed');
    await flush();
  }
};

const document = {
  'entity-type': 'document',
  contextParameters: {
    actionButton: {},
    firstAccessibleAncestor: {
      path: '/default-domain/Workspaces/File 1',
      title: 'my file',
      type: 'File',
      uid: '7ertyyy-hdjkdks-874fghd',
      facets: ['facet1', 'facet2'],
      schemas: [
        {
          prefix: 'pre',
          name: 'schema1',
        },
        {
          prefix: 'pre',
          name: 'schema2',
        },
      ],
    },
  },
};
suite('nuxeo-document-parent-inspector-button', () => {
  let button;
  let actionButton;
  const buildButton = async () => {
    actionButton = await fixture(
      html`
        <nuxeo-document-parent-inspector-button .document="${document}"> </nuxeo-document-parent-inspector-button>
      `,
    );
    await flush();
    return actionButton;
  };
  suite('Parent Inspector', () => {
    test('Should open the parent inspector dialog', async () => {
      button = await buildButton();
      const actionBtn = button.$$('.action');
      const closeButton = button.$$('paper-button.secondary');
      const { dialog } = button.$;
      actionBtn.click();
      await waitForDialogOpen(dialog);
      expect(dialog.opened).to.be.true;
      expect(isElementVisible(dialog)).to.be.true;
      expect(isElementVisible(closeButton)).to.be.true;
    });

    test('Should close the parent inspector dialog', async () => {
      button = await buildButton();
      const actionBtn = button.$$('.action');
      const closeButton = button.$$('paper-button.secondary');
      const { dialog } = button.$;
      actionBtn.click();
      await waitForDialogOpen(dialog);
      expect(isElementVisible(closeButton)).to.be.true;
      closeButton.click();
      await waitForDialogClose(dialog);
      expect(dialog.opened).to.be.false;
      expect(isElementVisible(dialog)).to.be.false;
      expect(isElementVisible(closeButton)).to.be.false;
    });

    test('Should not display parent inspector icon when a document is trashed', async () => {
      const trashDocument = {
        'entity-type': 'document',
        contextParameters: {
          actionButton: {},
          firstAccessibleAncestor: {
            path: '/default-domain/Workspaces/File 1',
            title: 'my file',
            type: 'File',
            uid: '7ertyyy-hdjkdks-874fghd',
            isTrashed: true,
          },
        },
      };
      actionButton.set('document', trashDocument);
      await flush();
      const actionBtn = button.$$('.action');
      expect(isElementVisible(actionBtn)).to.be.false;
    });

    test('Should display title, UID, path, schemas and facets in parent inspector dialog', async () => {
      button = await buildButton();
      button.currentUser = {
        properties: {
          username: 'John',
        },
        isAdministrator: true,
      };
      await flush();
      const actionBtn = button.$$('.action');
      const { dialog } = button.$;
      actionBtn.click();
      await waitForDialogOpen(dialog);
      const title = button.$$('.table tr:nth-child(1) td:nth-child(2)');
      const path = button.$$('.table tr:nth-child(2) td:nth-child(2)');
      const uid = button.$$('.table tr:nth-child(3) td:nth-child(2)');
      const facet1 = button.$$('.facetscontainer .facets .show-items:nth-child(1)');
      const facet2 = button.$$('.facetscontainer .facets .show-items:nth-child(2)');
      const schema1 = button.$$('.schemascontainer .schemas .show-items:nth-child(1)');
      const schema2 = button.$$('.schemascontainer .schemas .show-items:nth-child(2)');
      expect(title.innerHTML).to.equals('my file');
      expect(path.innerHTML).to.equals('/default-domain/Workspaces/File 1');
      expect(uid.innerHTML).to.equals('7ertyyy-hdjkdks-874fghd');
      expect(facet1.innerHTML).to.equals('facet1');
      expect(facet2.innerHTML).to.equals('facet2');
      expect(schema1.innerHTML).to.equals('pre:schema1');
      expect(schema2.innerHTML).to.equals('pre:schema2');
    });

    test('Should hide uid and schemas in parent inspector dialog if user is not administrator', async () => {
      button = await buildButton();
      button.currentUser = {
        properties: {
          username: 'Mary',
        },
        isAdministrator: false,
      };
      await flush();
      const actionBtn = button.$$('.action');
      const { dialog } = button.$;
      actionBtn.click();
      await waitForDialogOpen(dialog);
      const title = button.$$('.table tr:nth-child(1) td:nth-child(2)');
      const path = button.$$('.table tr:nth-child(2) td:nth-child(2)');
      const uid = button.$$('.table tr:nth-child(3) td:nth-child(2)');
      const facets = button.$$('.facetscontainer .facets > .show-items');
      const schemas = button.$$('.schemascontainer .schemas > .show-items');
      expect(title.innerHTML).to.contains('my file');
      expect(path.innerHTML).to.contains('/default-domain/Workspaces/File 1');
      expect(isElementVisible(uid)).to.be.false;
      expect(isElementVisible(facets)).to.be.true;
      expect(isElementVisible(schemas)).to.be.false;
    });
  });
});
