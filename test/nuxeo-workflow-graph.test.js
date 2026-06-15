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

  suite('show', () => {
    // Regression test for WEBUI-2055: the graph is initially painted while the dialog is
    // hidden (so every element offset is 0). Once the dialog is open, the graph must be
    // rebuilt from scratch so jsPlumb 2.15.x picks up the real offsets for both endpoints
    // and connector segments.
    test('should rebuild the graph after the dialog has been opened', async () => {
      sinon.stub(element.$.graphResource, 'execute').resolves();
      const toggle = sinon.stub(element.$.graphDialog, 'toggle');
      const updateGraph = sinon.stub(element, '_updateGraph');
      // Assign after stubbing so the observer call is captured by the stub.
      element.graph = { nodes: [], transitions: [] };
      // The `graph` observer fired once for the assignment above; reset so we can assert that
      // `show()` does NOT re-render until the dialog is open.
      updateGraph.resetHistory();

      element.show();
      // Wait for the resource promise to resolve and the listener to be attached.
      await Promise.resolve();
      await Promise.resolve();

      expect(toggle).to.have.been.calledOnce;
      expect(updateGraph).to.not.have.been.called;

      element.$.graphDialog.dispatchEvent(new CustomEvent('iron-overlay-opened'));

      expect(updateGraph).to.have.been.calledOnce;
      expect(updateGraph).to.have.been.calledWith(element.graph);
    });
  });
});
