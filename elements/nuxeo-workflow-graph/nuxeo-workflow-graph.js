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
/* Note: support for user supplied segments was removed in 2.0.5 */
/**
`nuxeo-workflow-graph`
@group Nuxeo UI
@element nuxeo-workflow-graph
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';
import { I18nBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-i18n-behavior.js';
import '@nuxeo/nuxeo-ui-elements/widgets/nuxeo-dialog.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import 'jsplumb/dist/js/jsplumb.js';

Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      #container {
        position: relative;
        width: 880px;
        height: 720px;
      }

      .workflow_node {
        position: absolute;
        text-align: center;
        font-size: .92em;
        z-index: 100;
      }

      .workflow_simple_task,
      .workflow_multiple_task {
        height: 80px;
        width: 80px;
        color: #006da6;
        padding-top: 1.2em;
        background-color: #f7f8f9;
        border-radius: 0.5em;
        box-sizing: border-box;
      }

      .workflow_simple_task {
        border: 1px solid #3c9ae2;
      }

      .workflow_multiple_task {
        border: 3px double #3c9ae2;
      }

      .workflow_fork_node,
      .workflow_merge_node {
        width: 0;
        height: 0;
        border-bottom: 40px solid #a4c9da;
        border-left: 20px solid transparent;
        border-right: 20px solid transparent;
        line-height: 100%;
      }

      .workflow_merge_node {
        border-top: 40px solid #dededd;
        border-bottom: 0;
        line-height: 0;
      }

      .workflow_start_node,
      .workflow_end_node {
        width: 40px;
        height: 40px;
        background: #92c938;
        border-radius: 40px;
        color: #fff;
        line-height: 40px;
      }

      .workflow_end_node {
        background: #f04545;
      }

      .workflow_subworkflow_task {
        border: 2px solid #3c9ae2;
        /*background: url("../icons/subworkflow_bg_node.png") no-repeat scroll right bottom white*/
      }

      .workflow_node_suspended {
        background-color: #3c9ae2;
        font-weight: bold;
        color: #fff;
      }

      .workflow_connection_label {
        background-color: white;
        padding: .15em .25em;
        font: 12px sans-serif;
        color: #3780b9;
        z-index: 120;
        border: 1px dotted rgba(0, 0, 0, 0.2);
        opacity: 0.85;
        filter: alpha(opacity = 85);
        max-width: 170px;
        word-wrap: break-word;
        transform: none !important;
      }

      .jtk-endpoint {
        z-index: 110;
      }

      .jtk-overlay {
        z-index: 6;
      }
    </style>

    <nuxeo-resource id="graphResource" path="/workflow/[[workflowId]]/graph" response="{{graph}}" headers="{&quot;Content-Type&quot;:&quot;application/json&quot;}"></nuxeo-resource>

    <nuxeo-dialog id="graphDialog" with-backdrop="">
      <paper-dialog-scrollable>
        <div class="graph-container">
          <div id="container"></div>
        </div>
      </paper-dialog-scrollable>
      <div class="buttons">
        <paper-button noink="" class="primary" dialog-dismiss="">[[i18n('command.close')]]</paper-button>
      </div>
    </nuxeo-dialog>
`,

  is: 'nuxeo-workflow-graph',
  behaviors: [I18nBehavior, IronResizableBehavior],

  properties: {
    workflowId: {
      type: String
    },

    graph: {
      type: Object
    },

    dynamicAnchors: {
      type: Array,
      value: [0.5, 0.25, 0.75, 0, 1, 0.375, 0.625, 0.125, 0.875]
    },

    connectionColors: {
      type: Array,
      value: ['#92e1aa', '#F7BE81', '#BDBDBD', '#5882FA', '#E1F5A9',
        '#FA5858', '#FFFF00', '#FF0000', '#D8F781']
    },

    sourceEndpointOptions: {
      type: Object,
      value: {
        connector: ['Flowchart', {cornerRadius: 5}],
        paintStyle: {
          fill: '#92e1aa'
        },
        isSource: true,
        isTarget: false,
        uniqueEndpoint: true,
        maxConnections: 1
      }
    },

    targetEndpointOptions: {
      type: Object,
      value: {
        paintStyle: {
          fill: '#003f7d'
        },
        isSource: false,
        isTarget: true,
        reattach: true,
        // without specifying this the targetEndpoint doesn't accept multiple connections
        maxConnections: -1
      }
    },

    _jsPlumbInstance: {
      type: Object
    }
  },

  observers: [
    '_updateGraph(graph)'
  ],

  listeners: {
    'iron-resize': '_resize'
  },

  ready: function() {
    this.scopeSubtree(this.$.container, true);
    this._initialize();
  },

  show: function() {
    this.$.graphResource.execute().then(function() {
      this.$.graphDialog.toggle();
    }.bind(this)).catch((error) => {
      this.fire('notify', {message: this.i18n('documentPage.route.view.graph.error')});
      throw error;
    });
  },

  _initialize: function() {
    this._jsPlumbInstance = jsPlumb.getInstance({
      DragOptions: {
        cursor: 'pointer',
        zIndex: 2000
      },
      PaintStyle: {
        stroke: '#92e1aa',
        strokeWidth: 3,
        outlineWidth: 2,
        outlineStroke: 'white',
        joinstyle: 'round'
      },
      Endpoint: ['Dot', {
        radius: 6
      }],
      ConnectionOverlays: [['Arrow', {
        location: 0.8
      }, {
        foldback: 0.9,
        fill: '#92e1aa',
        width: 14
      }]]
    });
    this._jsPlumbInstance.setContainer(this.$.container);
  },

  _transitionOverlay: function(transition) {
    return [
      ['Arrow', {location: 0.8}, {foldback: 0.9, fill: '#92e1aa', width: 14}],
      ['Label', {
        label: '<span title="' + transition.label + '">' + transition.label + '</span>',
        cssClass: 'workflow_connection_label',
        location: 0.6
      }]
    ];
  },

  _nodeClass: function(node) {
    if (node.isStartNode) {
      return 'workflow_start_node';
    } else if (node.isEndNode) {
      return 'workflow_end_node';
    } else if (node.isMerge) {
      return 'workflow_merge_node';
    } else if (node.isMultiTask) {
      return 'workflow_multiple_task';
    } else if (node.hasSubWorkflow) {
      return 'workflow_subworkflow_task';
    } else {
      return 'workflow_simple_task';
    }
  },

  _updateGraph: function(data) {
    if (!data) {
      return;
    }

    // clear when re-rendering
    while (this.$.container.firstChild) {
      this.$.container.removeChild(this.$.container.firstChild);
    }
    this._jsPlumbInstance.reset();

    // XXX: build these in the template
    data.nodes.forEach(function(node) {
      var element = this.create('div', {id: node.id, innerHTML: node.title});
      element.style.left = node.x + 'px';
      element.style.top = node.y + 'px';

      element.classList.add('workflow_node');
      element.classList.add(this._nodeClass(node));
      if (node.state === 'suspended') {
        element.classList.add('workflow_node_suspended');
      }
      this.$.container.appendChild(element);
    }.bind(this));

    // initialize connection source points
    var nodes = [];

    // determine number of source endpoints per node
    var sourceEndpoints = {};
    data.transitions.forEach(function(transition) {
      sourceEndpoints[transition.nodeSourceId] = (sourceEndpoints[transition.nodeSourceId] || 0) + 1;
    });

    // use fixed dynamic anchors, only 9 items supported, after this everything
    // is displayed on the center
    data.transitions.forEach(function(transition) {
      var source = transition.nodeSourceId,
          target = transition.nodeTargetId;

      var anchorIndex = nodes.filter(function(v) { return v === source; }).length;
      if (anchorIndex > 9) {
        anchorIndex = 0;
      }
      nodes.push(source);

      // determine anchors for transition node
      var anchors = this.dynamicAnchors.slice(0, sourceEndpoints[source]).sort();
      // add endpoints
      var endPointSource = this._addSourceEndpoint(dom(this.$.container).querySelector('#' + source),
            anchors[anchorIndex]),
          endPointTarget = this._addTargetEndpoint(dom(this.$.container).querySelector('#' + target));

      var connection = this._jsPlumbInstance.connect({
        connector: 'Flowchart',
        source: endPointSource,
        target: endPointTarget,
        overlays: this._transitionOverlay(transition),
        paintStyle: {
          strokeWidth: 3,
          stroke: this.connectionColors[anchorIndex],
          outlineWidth: 2,
          outlineStroke: 'white',
          joinstyle: 'round'
        },
        detachable: false
      });

      // TODO: fix transition path
      // prepare the transition's path
      // ignore paths with only one segment
      /*
      var segments = connection.connector.getSegments();

      segments.length = 0;
      if (transition.path && transition.path.length > 2) {
        for (var i = 1; i < transition.path.length; i++) {
          segments.push(new jsPlumb.Segments.Straight({
            x1: transition.path[i - 1].x, y1: transition.path[i - 1].y,
            x2: transition.path[i].x, y2: transition.path[i].y
          }));
        }
      }
      */
    }.bind(this));

  },

  _addTargetEndpoint: function(target) {
    return this._jsPlumbInstance.addEndpoint(target, {anchor: 'TopCenter'}, this.targetEndpointOptions);
  },

  _addSourceEndpoint: function(source, pos) {
    var anchor = [pos, 1, 0, 1];
    return this._jsPlumbInstance.addEndpoint(source, {anchor: anchor}, this.sourceEndpointOptions);
  },

  _resize: function() {
    this._jsPlumbInstance.repaintEverything();
  }
});
