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

  suite('initial state', () => {
    test('should have dynamicAnchors defined', () => {
      expect(element.dynamicAnchors).to.be.an('array');
      expect(element.dynamicAnchors).to.have.length(9);
    });

    test('should have connectionColors defined', () => {
      expect(element.connectionColors).to.be.an('array');
      expect(element.connectionColors).to.have.length(9);
    });
  });

  suite('_nodeClass', () => {
    test('should return workflow_node_start for start nodes', () => {
      const node = { isStartNode: true };
      expect(element._nodeClass(node)).to.include('start');
    });

    test('should return workflow_node_end for end nodes', () => {
      const node = { isEndNode: true };
      expect(element._nodeClass(node)).to.include('end');
    });

    test('should return fork class for fork/join nodes', () => {
      const node = { isForkNode: true };
      expect(element._nodeClass(node)).to.include('fork');
    });

    test('should return merge class for merge nodes', () => {
      const node = { isMerge: true };
      expect(element._nodeClass(node)).to.include('merge');
    });

    test('should return simple class for regular nodes', () => {
      const node = {};
      expect(element._nodeClass(node)).to.include('simple');
    });
  });

  suite('_transitionOverlay', () => {
    test('should return array with overlay config', () => {
      const transition = { label: 'approve', path: '1-2' };
      const result = element._transitionOverlay(transition);
      expect(result).to.be.an('array');
    });
  });
});
