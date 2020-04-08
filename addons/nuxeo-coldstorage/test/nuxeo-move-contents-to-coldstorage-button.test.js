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
  fakeServer,
  fixture,
  flush,
  html,
  isElementVisible,
  tap,
  timePasses,
  waitForEvent,
} from '@nuxeo/testing-helpers';
import '../elements/nuxeo-move-contents-to-coldstorage-button.js';

suite('Addons', () => {
  suite('Cold Storage', () => {
    suite('nuxeo-move-contents-to-coldstorage-button', () => {
      let button;
      let documents;
      let server;

      setup(() => {
        server = fakeServer.create();
        documents = [
          {
            'entity-type': 'document',
            contextParameters: {
              permissions: ['Read'],
            },
            facets: [],
            properties: {
              'file:content': 'someContent',
            },
            type: 'File',
            uid: '123',
          },
          {
            'entity-type': 'document',
            contextParameters: {
              permissions: ['Read'],
            },
            facets: [],
            properties: {
              'file:content': 'otherContent',
            },
            type: 'File',
            uid: '456',
          },
        ];
      });

      teardown(() => {
        server.restore();
      });

      suite('Visibility', () => {
        test('Should not be visible when documents are not provided', async () => {
          button = await fixture(
            html`
              <nuxeo-move-contents-to-coldstorage-button></nuxeo-move-contents-to-coldstorage-button>
            `,
          );

          await flush();
          expect(isElementVisible(button)).to.be.false;
        });

        test('Should not be visible when user is null', async () => {
          button = await fixture(
            html`
              <nuxeo-move-content-to-coldstorage-button
                .documents=${documents}
              ></nuxeo-move-content-to-coldstorage-button>
            `,
          );
          button.currentUser = null;

          await flush();
          expect(isElementVisible(button)).to.be.false;
        });

        test('Should be visible when user is administrator ', async () => {
          button = await fixture(
            html`
              <nuxeo-move-contents-to-coldstorage-button
                .documents=${documents}
              ></nuxeo-move-contents-to-coldstorage-button>
            `,
          );

          await flush();
          expect(isElementVisible(button)).to.be.true;
        });

        test('Should be visible when user is member of "powerusers"', async () => {
          button = await fixture(
            html`
              <nuxeo-move-contents-to-coldstorage-button
                .documents=${documents}
              ></nuxeo-move-contents-to-coldstorage-button>
            `,
          );
          button.currentUser = {
            properties: {
              username: 'Mary',
            },
            extendedGroups: [{ name: 'powerusers' }],
          };

          await flush();
          expect(isElementVisible(button)).to.be.true;
        });

        test("Should not visible when at least one of the documents selected doesn't have content", async () => {
          documents[0].properties = {};
          button = await fixture(
            html`
              <nuxeo-move-contents-to-coldstorage-button
                .documents=${documents}
              ></nuxeo-move-contents-to-coldstorage-button>
            `,
          );

          await flush();
          expect(isElementVisible(button)).to.be.false;
        });

        test('Should be visible when all the documents selected have content', async () => {
          button = await fixture(
            html`
              <nuxeo-move-contents-to-coldstorage-button
                .documents=${documents}
              ></nuxeo-move-contents-to-coldstorage-button>
            `,
          );

          await flush();
          expect(isElementVisible(button)).to.be.true;
        });

        test('Should not visible when at least one of the documents selected has "ColdStorage" facet', async () => {
          documents[0].facets.push('ColdStorage');
          button = await fixture(
            html`
              <nuxeo-move-contents-to-coldstorage-button
                .documents=${documents}
              ></nuxeo-move-contents-to-coldstorage-button>
            `,
          );

          await flush();
          expect(isElementVisible(button)).to.be.false;
        });

        test('Should be visible when all the documents selected don\'t have "ColdStorage" facet', async () => {
          button = await fixture(
            html`
              <nuxeo-move-contents-to-coldstorage-button
                .documents=${documents}
              ></nuxeo-move-contents-to-coldstorage-button>
            `,
          );

          await flush();
          expect(isElementVisible(button)).to.be.true;
        });

        test(
          "Should not visible when at least one of the documents selected doesn't have " +
            '"WriteColdStorage" permission',
          async () => {
            documents[0].contextParameters.permissions.push('WriteToColdStorage');
            button = await fixture(
              html`
                <nuxeo-move-contents-to-coldstorage-button
                  .documents=${documents}
                ></nuxeo-move-contents-to-coldstorage-button>
              `,
            );
            button.currentUser = {
              properties: {
                username: 'Mary',
              },
            };

            await flush();
            expect(isElementVisible(button)).to.be.false;
          },
        );

        test('Should be visible when all the documents selected have "WriteColdStorage" permission', async () => {
          documents[0].contextParameters.permissions.push('WriteToColdStorage');
          documents[1].contextParameters.permissions.push('WriteToColdStorage');
          button = await fixture(
            html`
              <nuxeo-move-contents-to-coldstorage-button
                .documents=${documents}
              ></nuxeo-move-contents-to-coldstorage-button>
            `,
          );

          await flush();
          expect(isElementVisible(button)).to.be.true;
        });
      });

      suite('Interactions', () => {
        test('Should display a confirmation dialog when the button is pressed', async () => {
          button = await fixture(
            html`
              <nuxeo-move-contents-to-coldstorage-button
                .documents=${documents}
              ></nuxeo-move-contents-to-coldstorage-button>
            `,
          );
          await flush();

          tap(button.$$('.action'));
          await flush();

          const confirmationDialog = button.shadowRoot.querySelector('#contentsToMoveDialog');
          if (!isElementVisible(confirmationDialog)) {
            await waitForEvent(confirmationDialog, 'iron-overlay-opened');
          }
          expect(isElementVisible(confirmationDialog)).to.be.true;
          expect(isElementVisible(confirmationDialog.querySelector('#cancel'))).to.be.true;
          expect(isElementVisible(confirmationDialog.querySelector('#confirm'))).to.be.true;
        });

        suite('REST Calls', () => {
          let confirmationDialog;

          setup(async () => {
            button = await fixture(
              html`
                <nuxeo-move-contents-to-coldstorage-button
                  .documents=${documents}
                ></nuxeo-move-contents-to-coldstorage-button>
              `,
            );
            await flush();

            tap(button.$$('.action'));
            await flush();

            confirmationDialog = button.shadowRoot.querySelector('#contentsToMoveDialog');
            if (!isElementVisible(confirmationDialog)) {
              await waitForEvent(confirmationDialog, 'iron-overlay-opened');
            }
          });

          test('Should not do any REST call when cancel button is pressed', async () => {
            tap(confirmationDialog.querySelector('#cancel'));

            await timePasses();
            expect(server.getRequests().length).to.equal(0);
          });

          test('Should submit request when confirm button is pressed', async () => {
            server.respondWith('POST', '/api/v1/automation/Document.MoveToColdStorage');
            tap(confirmationDialog.querySelector('#confirm'));

            await timePasses();
            const request = server.getLastRequest('POST', '/api/v1/automation/Document.MoveToColdStorage');
            expect(request).to.exist;
            expect(request.body).to.be.have.property('input', 'docs:123,456');
          });

          test('Should fire "notify" event when server returns deletion error', async () => {
            server.rejectWith('POST', '/api/v1/automation/Document.MoveToColdStorage', { response: { status: 404 } });
            tap(confirmationDialog.querySelector('#confirm'));

            const event = await waitForEvent(button, 'notify');
            expect(event.detail).to.exist.and.to.have.key('message');
            expect(event.detail.message).to.be.equal('moveDocumentsContentsToColdStorage.error');
          });

          test('Should fire "refresh" and "notify" events when server returns deletion error', async () => {
            server.respondWith('POST', '/api/v1/automation/Document.MoveToColdStorage');
            tap(confirmationDialog.querySelector('#confirm'));

            await Promise.all([waitForEvent(button, 'refresh'), waitForEvent(button, 'notify')]).then((events) => {
              expect(events[1].detail).to.exist.and.to.have.key('message');
              expect(events[1].detail.message).to.be.equal('moveDocumentsContentsToColdStorage.success');
            });
          });
        });
      });
    });
  });
});
