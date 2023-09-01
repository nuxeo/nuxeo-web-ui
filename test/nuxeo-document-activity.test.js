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
import '../elements/nuxeo-document-activity/nuxeo-document-activity.js';

const document = {
  'entity-type': 'document',
  contextParameters: {
    element: {
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

suite('nuxeo-document-activity', () => {
  let server;
  let element;

  window.nuxeo.I18n.language = 'en';
  window.nuxeo.I18n.en = window.nuxeo.I18n.en || {};
  window.nuxeo.I18n.en['activity.view'] = 'viewed the document';
  window.nuxeo.I18n.en['activity.download'] = 'downloaded the document';
  window.nuxeo.I18n.en['activity.documentCreated'] = 'created the document';

  setup(async () => {
    server = await login();
    element = await fixture(
      html`
        <nuxeo-document-activity .document=${document}></nuxeo-document-activity>
      `,
    );
  });

  teardown(() => {
    server.restore();
  });

  suite('Display activity name and group gatherable activities', () => {
    test('Should display the activity name as view when user performs view action', async () => {
      const event = {
        extended: {
          clientReason: 'view',
        },
      };
      expect(element._activity(event)).to.equal('viewed the document');
    });

    test('Should display the activity name as download when user performs download action', async () => {
      element.document = {
        'entity-type': 'document',
        contextParameters: {
          element: {
            entries: [
              {
                path: '/default-domain',
                title: 'Domain',
                type: 'Domain',
                uid: '1',
              },
            ],
          },
          audit: [],
        },
        path: '/default-domain/workspaces/my workspace/folder 1/folder 2/folder 3/my file',
        title: 'my file',
        type: 'File',
        uid: '7',
      };
      const event = {
        extended: {
          clientReason: 'download',
        },
      };
      expect(element._activity(event)).to.equal('downloaded the document');
    });

    test('Should display the activity name as document created when user creates the document', async () => {
      const event = {
        eventId: 'documentCreated',
      };
      expect(element._activity(event)).to.equal('created the document');
    });

    test('Should gather the view actions as one group', async () => {
      const a = {
        extended: {
          clientReason: 'view',
        },
        eventDate: '2022-12-15T08:38:12.665Z',
        principalName: 'John Doe',
      };
      const b = {
        extended: {
          clientReason: 'view',
        },
        eventDate: '2022-12-15T08:36:12.665Z',
        principalName: 'John Doe',
      };
      expect(element._areGatherableActivities(a, b)).to.equal(true);
    });

    test('Should gather the download actions as one group', async () => {
      const a = {
        extended: {
          clientReason: 'download',
        },
        eventDate: '2022-12-15T08:38:12.665Z',
        principalName: 'John Doe',
      };
      const b = {
        extended: {
          clientReason: 'download',
        },
        eventDate: '2022-12-15T08:36:12.665Z',
        principalName: 'John Doe',
      };
      expect(element._areGatherableActivities(a, b)).to.equal(true);
    });
    test('Should not group non-gatherable activities', async () => {
      const a = {
        extended: {
          clientReason: 'download',
        },
        eventDate: '2022-12-15T08:38:12.665Z',
        principalName: 'John Doe',
      };
      const b = {
        eventId: 'documentCreated',
        extended: {},
        eventDate: '2022-12-15T08:36:12.665Z',
        principalName: 'John Doe',
      };
      expect(element._areGatherableActivities(a, b)).to.equal(false);
    });
  });
});
