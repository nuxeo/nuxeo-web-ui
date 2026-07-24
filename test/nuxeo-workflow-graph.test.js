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
import '../elements/nuxeo-workflow-graph/nuxeo-workflow-graph.js';

suite('nuxeo-workflow-graph', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-workflow-graph></nuxeo-workflow-graph>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_transitionOverlay', () => {
    test('should return array with overlay config', () => {
      const transition = { label: 'approve', path: '1-2' };
      const result = element._transitionOverlay(transition);
      expect(result).to.be.an('array');
    });

    test('should translate the transition label via i18n (ELEMENTS-1595)', () => {
      // Custom transitions expose an i18n key (e.g. `command.remove`) rather than a resolved
      // string; the overlay must display the translation, not the raw key.
      element.i18n.withArgs('command.remove').returns('Remove');
      const result = element._transitionOverlay({ label: 'command.remove', path: '1-2' });
      const labelOverlay = result.find((overlay) => overlay[0] === 'Label');
      expect(element.i18n).to.have.been.calledWith('command.remove');
      expect(labelOverlay[1].label).to.equal('<span title="Remove">Remove</span>');
    });
  });
});
