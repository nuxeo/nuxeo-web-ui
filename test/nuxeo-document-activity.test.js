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
    element = await fixture(html` <nuxeo-document-activity .document=${document}></nuxeo-document-activity> `);
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
      const original = [
        {
          extended: {
            clientReason: 'download',
          },
          eventDate: '2022-12-15T08:38:12.665Z',
          principalName: 'John Doe',
        },
        {
          extended: {
            clientReason: 'download',
          },
          eventDate: '2022-12-15T08:36:12.665Z',
          principalName: 'John Doe',
        },
      ];
      const expected = [
        {
          extended: { clientReason: 'download' },
          eventDate: '2022-12-15T08:38:12.665Z',
          principalName: 'John Doe',
        },
      ];
      expect(element._gatherDuplicatedActivities(original)[0].extended.clientReason).to.equal(
        expected[0].extended.clientReason,
      );
      expect(element._gatherDuplicatedActivities(original)[0].eventDate).to.equal(expected[0].eventDate);
      expect(element._gatherDuplicatedActivities(original)[0].principalName).to.equal(expected[0].principalName);
      expect(element._gatherDuplicatedActivities(original).length).to.equal(1);
    });
    test('Should not group non-gatherable activities', async () => {
      const original = [
        {
          extended: {
            clientReason: 'download',
          },
          eventDate: '2022-12-15T08:38:12.665Z',
          principalName: 'John Doe',
        },
        {
          eventId: 'documentCreated',
          extended: {},
          eventDate: '2022-12-15T08:36:12.665Z',
          principalName: 'John Doe',
        },
      ];
      expect(element._gatherDuplicatedActivities(original).length).to.equal(2);
    });
  });

  suite('_resolvedPrincipal', () => {
    test('should return entity when present in map', () => {
      const entity = { 'entity-type': 'user', id: 'jdoe', properties: { firstName: 'Jane', lastName: 'Doe' } };
      expect(element._resolvedPrincipal('jdoe', { jdoe: entity })).to.equal(entity);
    });

    test('should fall back to raw username when not resolved', () => {
      expect(element._resolvedPrincipal('jdoe', {})).to.equal('jdoe');
    });

    test('should fall back to raw username when entities is null', () => {
      expect(element._resolvedPrincipal('jdoe', null)).to.equal('jdoe');
    });
  });

  suite('_fetchPrincipals', () => {
    test('should skip fetching and reset state when activities is empty', async () => {
      element._principalEntities = { stale: { id: 'stale' } };
      element._principalsLoading = true;
      const getSpy = sinon.spy(element.$.user, 'get');
      await element._fetchPrincipals([]);
      expect(getSpy).to.not.have.been.called;
      expect(element._principalEntities).to.deep.equal({});
      expect(element._principalsLoading).to.be.false;
      getSpy.restore();
    });

    test('should fetch user entity for each unique principal', async () => {
      const entity = { 'entity-type': 'user', id: 'jdoe', properties: { firstName: 'Jane', lastName: 'Doe' } };
      sinon.stub(element.$.user, 'get').resolves(entity);
      await element._fetchPrincipals([
        { principalName: 'jdoe', eventId: 'view' },
        { principalName: 'jdoe', eventId: 'download' },
      ]);
      expect(element.$.user.get).to.have.been.calledOnce;
      expect(element._principalEntities).to.have.property('jdoe', entity);
      element.$.user.get.restore();
    });

    test('should handle fetch failure gracefully', async () => {
      sinon.stub(element.$.user, 'get').rejects(new Error('not found'));
      const warnSpy = sinon.stub(console, 'warn');
      await element._fetchPrincipals([{ principalName: 'unknown', eventId: 'view' }]);
      expect(element._principalEntities).to.have.property('unknown', 'unknown');
      // A statusless (e.g. network/transport) error is unexpected and should be logged.
      expect(warnSpy).to.have.been.calledOnce;
      warnSpy.restore();
      element.$.user.get.restore();
    });

    test('should warn on unexpected non-404 errors', async () => {
      const error = new Error('internal error');
      error.status = 500;
      sinon.stub(element.$.user, 'get').rejects(error);
      const warnSpy = sinon.stub(console, 'warn');
      await element._fetchPrincipals([{ principalName: 'baduser', eventId: 'view' }]);
      expect(element._principalEntities).to.have.property('baduser', 'baduser');
      expect(warnSpy).to.have.been.calledOnce;
      warnSpy.restore();
      element.$.user.get.restore();
    });

    test('should not warn on 404 errors', async () => {
      const error = new Error('not found');
      error.status = 404;
      sinon.stub(element.$.user, 'get').rejects(error);
      const warnSpy = sinon.stub(console, 'warn');
      await element._fetchPrincipals([{ principalName: 'deleted', eventId: 'view' }]);
      expect(element._principalEntities).to.have.property('deleted', 'deleted');
      expect(warnSpy).to.not.have.been.called;
      warnSpy.restore();
      element.$.user.get.restore();
    });

    test('should URL-encode principal names in the request path', async () => {
      const entity = { 'entity-type': 'user', id: 'a b/c' };
      const getStub = sinon.stub(element.$.user, 'get').callsFake(() => {
        expect(element.$.user.path).to.equal('/user/a%20b%2Fc');
        return Promise.resolve(entity);
      });
      await element._fetchPrincipals([{ principalName: 'a b/c', eventId: 'view' }]);
      expect(getStub).to.have.been.calledOnce;
      element.$.user.get.restore();
    });

    test('should discard stale responses via request-id guard', async () => {
      const first = { 'entity-type': 'user', id: 'first' };
      const second = { 'entity-type': 'user', id: 'second' };
      sinon.stub(element.$.user, 'get').resolves(first);
      const p1 = element._fetchPrincipals([{ principalName: 'first', eventId: 'view' }]);
      element.$.user.get.resolves(second);
      const p2 = element._fetchPrincipals([{ principalName: 'second', eventId: 'view' }]);
      await Promise.all([p1, p2]);
      expect(element._principalEntities).to.have.property('second');
      expect(element._principalEntities).to.not.have.property('first');
      element.$.user.get.restore();
    });

    test('should serialize concurrent invocations on the shared resource', async () => {
      const paths = [];
      sinon.stub(element.$.user, 'get').callsFake(() => {
        // Record the path each lookup requests; interleaved runs would corrupt the order.
        paths.push(element.$.user.path);
        return Promise.resolve({ 'entity-type': 'user', id: element.$.user.path });
      });
      const p1 = element._fetchPrincipals([
        { principalName: 'a', eventId: 'view' },
        { principalName: 'b', eventId: 'view' },
      ]);
      const p2 = element._fetchPrincipals([{ principalName: 'c', eventId: 'view' }]);
      await Promise.all([p1, p2]);
      // Serialized: first invocation's lookups (a, b) complete before the second's (c).
      expect(paths).to.deep.equal(['/user/a', '/user/b', '/user/c']);
      element.$.user.get.restore();
    });

    test('should discard in-flight results when activities is reset to empty mid-flight', async () => {
      let resolveGet;
      sinon.stub(element.$.user, 'get').returns(
        new Promise((resolve) => {
          resolveGet = resolve;
        }),
      );
      const inFlight = element._fetchPrincipals([{ principalName: 'jdoe', eventId: 'view' }]);
      await new Promise((r) => setTimeout(r, 0)); // let the in-flight lookup start
      element._fetchPrincipals([]); // reset while the lookup is pending
      expect(element._principalEntities).to.deep.equal({});
      resolveGet({ 'entity-type': 'user', id: 'jdoe' });
      await inFlight;
      // The stale lookup must not repopulate the reset state.
      expect(element._principalEntities).to.deep.equal({});
      element.$.user.get.restore();
    });
  });
});
