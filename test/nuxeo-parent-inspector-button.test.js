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

// import { fixture, html, flush, waitForEvent, isElementVisible } from '@nuxeo/testing-helpers';
// import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
// import '../elements/nuxeo-document-actions/nuxeo-parent-inspector-button.js';

import '@webcomponents/html-imports/html-imports.min.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@nuxeo/nuxeo-ui-elements/nuxeo-data-table/iron-data-table.js';
import { fixture, html, flush, waitForEvent, isElementVisible } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-document-actions/nuxeo-parent-inspector-button.js';

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
    firstAccessibleAncestor: {
      facets: ['Folderish', 'NXTag', 'SuperSpace'],
      schemas: [
        { name: 'webcontainer', prefix: 'webc' },
        { name: 'file', prefix: 'file' },
        { name: 'common', prefix: 'common' },
        { name: 'files', prefix: 'files' },
        { name: 'dublincore', prefix: 'dc' },
        { name: 'publishing', prefix: 'publish' },
        { name: 'facetedTag', prefix: 'nxtag' },
      ],
      path: '/default-domain/workspaces/Test 2',
      title: 'Test 2',
      type: 'Workspace',
      uid: '4dd1e0d8-7af8-48e1-b298-5a94d0bdc3fc',
    },
  },
  path: '/default-domain/workspaces/Test 2',
  title: 'Test 2',
  type: 'Workspace',
  uid: '4dd1e0d8-7af8-48e1-b298-5a94d0bdc3fc',
};

suite('nuxeo-parent-inspector', () => {
  let button;
  let actionButton;

  const buildButton = async () => {
    actionButton = await fixture(
      html`
        <nuxeo-parent-inspector-button .document=${document}></nuxeo-parent-inspector-button>
      `,
    );

    await flush();
    return actionButton;
  };

  function isAdministratorFunc(isAdmin) {
    button.currentUser = {
      properties: {
        username: 'John',
      },
      isAdministrator: isAdmin,
    };
  }

  function isDialogOpen(dialog, cancelButton) {
    expect(dialog.opened).to.be.true;
    expect(isElementVisible(dialog)).to.be.true;
    expect(isElementVisible(cancelButton)).to.be.true;
  }

  function isDialogClose(dialog, cancelButton) {
    expect(dialog.opened).to.be.false;
    expect(isElementVisible(dialog)).to.be.false;
    expect(isElementVisible(cancelButton)).to.be.false;
  }

  async function dialogOpened(dialogButton, dialog) {
    dialogButton.$$('.action').click();
    await waitForDialogOpen(dialog);
  }

  async function dialogClosed(cancelButton, dialog) {
    cancelButton.click();
    await waitForDialogClose(dialog);
  }

  suite('Parent inspector dialog box visibility', () => {
    setup(async () => {
      button = await buildButton();
    });

    test('Should open parent inspector dialog popup', async () => {
      isAdministratorFunc(true);
      await flush();
      const { dialog } = button.$;
      const cancelButton = button.$$('paper-button.secondary');
      // check that dialog is closed
      isDialogClose(dialog, cancelButton);
      // open the parent inspactor dialog
      await dialogOpened(button, dialog);
      // check that dialog is open
      isDialogOpen(dialog, cancelButton);

      await dialogClosed(cancelButton, dialog);
      // check that dialog is closed
      isDialogClose(dialog, cancelButton);
    });

    test('Should close parent inspector dialog popup', async () => {
      isAdministratorFunc(true);
      await flush();
      const { dialog } = button.$;
      const cancelButton = button.$$('paper-button.secondary');
      // open the parent inspactor dialog
      await dialogOpened(button, dialog);
      // check that dialog is open
      isDialogOpen(dialog, cancelButton);

      await dialogClosed(cancelButton, dialog);
      // check that dialog is closed
      isDialogClose(dialog, cancelButton);
    });
  });

  suite('Trash document', () => {
    test('Should not visible parent inspector icon when document set as trash', async () => {
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
  });

  suite('Should be set up parent inspector details', () => {
    test('Should set header content in parent inspector dialog popup', async () => {
      button = await buildButton();
      isAdministratorFunc(true);

      await flush();
      const { dialog } = button.$;
      const cancelButton = button.$$('paper-button.secondary');
      // open the parent inspactor dialog
      await dialogOpened(button, dialog);
      // check that dialog is open
      isDialogOpen(dialog, cancelButton);

      const header = button.$$('.container .scrollable .header');
      expect(isElementVisible(header)).to.be.true;

      const subFolderFirst = button.$$('.container .scrollable .parent-sub-folder div:nth-child(1)');
      expect(isElementVisible(subFolderFirst)).to.be.true;
      const title = subFolderFirst.querySelector('label').textContent.trim();
      expect(title).to.be.equals(document.contextParameters.firstAccessibleAncestor.title);

      const subFolderSecond = button.$$('.container .scrollable .parent-sub-folder div:nth-child(2)');
      expect(isElementVisible(subFolderSecond)).to.be.true;
      const path = subFolderSecond.querySelector('label').textContent.trim();
      expect(path).to.be.equals(document.contextParameters.firstAccessibleAncestor.path);

      const subFolderThird = button.$$('.container .scrollable .parent-sub-folder div:nth-child(3)');
      expect(isElementVisible(subFolderThird)).to.be.true;
      const uid = subFolderThird.querySelector('label').textContent.trim();
      expect(uid).to.be.equals(document.contextParameters.firstAccessibleAncestor.uid);

      await dialogClosed(cancelButton, dialog);
      // check that dialog is closed
      isDialogClose(dialog, cancelButton);
    });

    test('Should set facets content in parent inspector dialog popup', async () => {
      button = await buildButton();
      isAdministratorFunc(true);

      await flush();
      const { dialog } = button.$;
      const cancelButton = button.$$('paper-button.secondary');
      // open the parent inspactor dialog
      await dialogOpened(button, dialog);
      // check that dialog is open
      isDialogOpen(dialog, cancelButton);

      const facet1 = button.$$('.parent-facets .parent-items:nth-child(1)');
      expect(facet1.innerHTML).to.equals(document.contextParameters.firstAccessibleAncestor.facets[0]);

      const facet2 = button.$$('.parent-facets .parent-items:nth-child(2)');
      expect(facet2.innerHTML).to.equals(document.contextParameters.firstAccessibleAncestor.facets[1]);

      const facet3 = button.$$('.parent-facets .parent-items:nth-child(3)');
      expect(facet3.innerHTML).to.equals(document.contextParameters.firstAccessibleAncestor.facets[2]);

      const schemaFolder = button.$$('.container .scrollable .parent-schemas');
      expect(isElementVisible(schemaFolder)).to.be.true;

      const schema1 = button.$$('.parent-schemas .parent-items:nth-child(1)');
      expect(schema1.innerHTML).to.equals(
        `${document.contextParameters.firstAccessibleAncestor.schemas[0].prefix 
          }:${ 
          document.contextParameters.firstAccessibleAncestor.schemas[0].name}`,
      );

      const schema2 = button.$$('.parent-schemas .parent-items:nth-child(2)');
      expect(schema2.innerHTML).to.equals(
        `${document.contextParameters.firstAccessibleAncestor.schemas[1].prefix 
          }:${ 
          document.contextParameters.firstAccessibleAncestor.schemas[1].name}`,
      );

      await dialogClosed(cancelButton, dialog);
      // check that dialog is closed
      isDialogClose(dialog, cancelButton);
    });

    test('Should set schemas content in parent inspector dialog popup', async () => {
      button = await buildButton();
      isAdministratorFunc(true);

      await flush();
      const { dialog } = button.$;
      const cancelButton = button.$$('paper-button.secondary');
      // open the parent inspactor dialog
      await dialogOpened(button, dialog);
      // check that dialog is open
      isDialogOpen(dialog, cancelButton);

      const schemaFolder = button.$$('.container .scrollable .parent-schemas');
      expect(isElementVisible(schemaFolder)).to.be.true;

      const schema1 = button.$$('.parent-schemas .parent-items:nth-child(1)');
      expect(schema1.innerHTML).to.equals(
        `${document.contextParameters.firstAccessibleAncestor.schemas[0].prefix 
          }:${ 
          document.contextParameters.firstAccessibleAncestor.schemas[0].name}`,
      );

      const schema2 = button.$$('.parent-schemas .parent-items:nth-child(2)');
      expect(schema2.innerHTML).to.equals(
        `${document.contextParameters.firstAccessibleAncestor.schemas[1].prefix 
          }:${ 
          document.contextParameters.firstAccessibleAncestor.schemas[1].name}`,
      );

      await dialogClosed(cancelButton, dialog);
      // check that dialog is closed
      isDialogClose(dialog, cancelButton);
    });

    test('Should visible schema when user in an admin', async () => {
      isAdministratorFunc(true);
      await flush();

      const { dialog } = button.$;
      const cancelButton = button.$$('paper-button.secondary');
      // open the parent inspactor dialog
      await dialogOpened(button, dialog);
      // check that dialog is open
      expect(dialog.opened).to.be.true;

      const schemaFolder = button.$$('.container .scrollable .parent-schemas');
      expect(isElementVisible(schemaFolder)).to.be.false;

      await dialogClosed(cancelButton, dialog);
      // check that dialog is closed
      isDialogClose(dialog, cancelButton);
    });

    test('Should not visible up schema when user in not an admin', async () => {
      isAdministratorFunc(false);
      await flush();

      const { dialog } = button.$;
      const cancelButton = button.$$('paper-button.secondary');
      // open the parent inspactor dialog
      await dialogOpened(button, dialog);
      // check that dialog is open
      expect(dialog.opened).to.be.true;

      const schemaFolder = button.$$('.container .scrollable .parent-schemas');
      expect(isElementVisible(schemaFolder)).to.be.false;

      await dialogClosed(cancelButton, dialog);
      // check that dialog is closed
      isDialogClose(dialog, cancelButton);
    });
  });
});
