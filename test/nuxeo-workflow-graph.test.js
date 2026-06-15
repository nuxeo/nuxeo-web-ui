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
import { fixture, flush, html, login } from '@nuxeo/testing-helpers';
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
    // Regression test for WEBUI-2055: setting `graph` (via the resource response) initially
    // paints the graph while the dialog is still hidden, so every element offset is 0. The
    // fix is that `show()` schedules an additional `_updateGraph()` call after
    // `iron-overlay-opened` so jsPlumb 2.15.x picks up the real offsets for both endpoints
    // and connector segments.
    test('should rebuild the graph after the dialog has been opened', async () => {
      sinon.stub(element.$.graphResource, 'execute').resolves();
      const toggle = sinon.stub(element.$.graphDialog, 'toggle');
      const updateGraph = sinon.stub(element, '_updateGraph');
      // Assign after stubbing so the initial observer call is captured by the stub.
      element.graph = { nodes: [], transitions: [] };
      // Polymer flushes property-effect observers asynchronously, so flush before resetting
      // the stub history to avoid a race with the initial `_updateGraph(graph)` call.
      await flush();
      // We only want to assert that `show()` does NOT trigger an extra `_updateGraph()` call
      // until the dialog is opened, so drop the initial-observer invocation from the history.
      updateGraph.resetHistory();

      // Awaiting the promise returned by `show()` deterministically resumes after the `.then()`
      // in `show()` has run (it shares the same micro-task chain as the stubbed `execute()`).
      await element.show();

      expect(toggle).to.have.been.calledOnce;
      expect(updateGraph).to.not.have.been.called;

      element.$.graphDialog.dispatchEvent(new CustomEvent('iron-overlay-opened'));

      expect(updateGraph).to.have.been.calledOnce;
      expect(updateGraph).to.have.been.calledWith(element.graph);
    });
  });
});
