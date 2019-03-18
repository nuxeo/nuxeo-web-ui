/**
(C) Copyright 2015 Nuxeo SA (http://nuxeo.com/) and others.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Contributors:
    Tiago Cardoso <tcardoso@nuxeo.com>
    Miguel Nixo <mnixo@nuxeo.com>
*/
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';

import * as THREE from 'three';
import 'three/examples/js/controls/OrbitControls.js';
import 'three/examples/js/loaders/GLTFLoader.js';
import 'three/examples/js/loaders/gltf/glTF-parser.js';
import 'three/examples/js/loaders/gltf/glTFLoader.js';
import 'three/examples/js/loaders/gltf/glTFLoaderUtils.js';
import 'three/examples/js/loaders/gltf/glTFAnimation.js';
import 'three/examples/js/loaders/gltf/glTFShaders.js';


/**
`nuxeo-3d-viewer` allows viewing 3D content in glTF format.

    <nuxeo-3d-viewer></nuxeo-3d-viewer>

Example - Load a source with a simple loader. Quicker and faster

    <nuxeo-3d-viewer src="[[source]]"></nuxeo-3d-viewer>

Example - Load a source with complete loader. Loads animations, shaders and all 3D assets from glTF.

    <nuxeo-3d-viewer src="[[source]]" loader="complete"></nuxeo-3d-viewer>

@group Nuxeo 3D Elements
@element nuxeo-3d-viewer
@demo demo/nuxeo-3d-viewer/index.html
*/
Polymer({
  _template: html`
    <style>
      :host {
        display: block;
      }

      #threed {
        position: relative;
        width:100%;
        height:100%;
      }

      #threed canvas {
        display: block;
        width:100% !important;
      }

      #progress {
        position: absolute;
        top: 50%;
        left: 50%;
        padding: 16px;
        background: rgba(255, 255, 255, 0.5);
        transform: translate(-50%, -50%);
      }

    </style>
    <div id="threed">
      <paper-progress id="progress" hidden="true"></paper-progress>
    </div>
`,

  is: 'nuxeo-3d-viewer',

  behaviors: [
    IronResizableBehavior,
  ],

  properties: {

    /**
     * The `loader` attribute specifies type of loader.
     * 'simple' : no shaders, annimations, etc. fast and simple.
     * 'complete' : complete loader. full feature and slower.
     */
    loader: {
      type: String,
      value: 'simple',
      observer: '_loaderChanged',
    },

    /**
     * The `src` to be displayed.
     */
    src: {
      type: String,
      observer: '_sourceChanged',
    },

    /**
     * The `sphericalCoords` to be set externally.
     */
    sphericalCoords: {
      type: Array,
      value: [0, 0],
      notify: true,
      reflectToAttribute: true,
      observer: '_sphericalCoordsChanged',
    },

    /**
     * The `setupFinished' to indicate if setup process is finished
     */
    setupFinished : {
      type: Boolean,
      readOnly: true,
      value: false,
      notify: true,
    },
  },

  listeners: {
    'iron-resize': '_resize',
    'on-setup-finished': 'load',
  },

  attached() {
    this.async(this.notifyResize, 1000);
  },

  ready() {
    this._setupDone = false;
    this.$.threed.width = this.width;
    this.$.threed.height = this.height;
    this._setup();
    this._loaderChanged();
  },

  load() {

    const onLoadFromSrc = function(src) {
      return function(gltf) {
        if(src !== this.src) {
          return;
        }
        this.clear();
        this._processLoad(gltf);
        this._resize();
        this._render();
      }.bind(this);
    }.bind(this);

    const onProgressFromTS = function(timestamp) {
      return function(event) {
        if (timestamp !== this.latestLoadTS) {
          return;
        }
        this.$.progress.value = event.loaded / event.total * 100;
      }.bind(this);
    }.bind(this);

    if (this.src) {
      this.latestLoadTS = Date.now();
      this.$.progress.value = 0;
      this.$.progress.hidden = false;
      this.gltfLoader.load(this.src, onLoadFromSrc(this.src), onProgressFromTS(this.latestLoadTS));
    }
  },

  clear() {
    if (this.scene) {
      const objects = this.scene.children;
      while ( objects.length > 0 ) {
        this._removeObject( objects[ 0 ] );
      }
    }

  },

  _loaderChanged () {
    if (this.loader === 'complete') {
      this.gltfLoader = new THREE.glTFLoader(); // eslint-disable-line new-cap
    } else {
      this.gltfLoader = new THREE.GLTFLoader();
    }
  },

  _removeObject ( object ) {
    if ( object.parent === null ) return; // avoid deleting the camera or scene
    object.parent.remove( object );
  },

  _sourceChanged() {
    this.load();
  },

  _sphericalCoordsChanged() {
    this.setCameraFromAngles(this.sphericalCoords[0], this.sphericalCoords[1]);
  },

  _setup() {
    this._setupScene();
    this._setupCameras();
    this._setupLights();
    this._setupRenderer();
    this._setupControls();
    this._setSetupFinished(true);
  },

  _setupScene() {
    this.root = new THREE.Scene();
    this.scene = new THREE.Scene();
    this.root.add(this.scene);
    const geometry = new THREE.PlaneGeometry(0.5, 0.5);
    const material = new THREE.MeshPhongMaterial({color: 0xffffff});
    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.scale.multiplyScalar(3);
    this.ground.receiveShadow = true;
    this.ground.position.copy(new THREE.Vector3(0, -0.6, 0));
    this.root.add(this.ground);
  },

  _setupCameras() {
    this.cameras = {};
    this.camera = new THREE.PerspectiveCamera(25, 0.5 , 0.001, 2000);
    this.root.add(this.camera);
    this._cameraComposition(this.camera);
  },

  _setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.root.add(ambient);

    const spot = new THREE.SpotLight(0xffffff, 0.5);
    spot.position.set(0, 5, 0);
    spot.target.position.set(0, 0, 0);
    spot.shadow.camera.far = 10;
    spot.castShadow = true;
    spot.shadow.darkness = 0.001;
    spot.shadow.bias = 0.01;
    spot.shadow.mapSize.width = 1024;
    spot.shadow.mapSize.height = 1024;
    this.root.add(spot);
  },

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // this.renderer.setSize(400, 400);

    // enable shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMapSoft = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    dom(this.$.threed).appendChild(this.renderer.domElement);
  },

  _setupControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.$.threed);
    this.controls.addEventListener('change', this._controlsUpdated.bind(this));
    this._sphericalCoordsChanged();
  },

  _controlsUpdated() {
    this._render();
  },

  _resize() {
    if (this.setupFinished) {
      this.camera.aspect = this.$.threed.offsetWidth / this.$.threed.offsetHeight;
      this.camera.updateProjectionMatrix();

      let i; const len = this.cameras.length;
      for (i = 0; i < len; i++) {
        this.cameras[i].aspect = this.$.threed.offsetWidth / this.$.threed.offsetHeight;
        this.cameras[i].updateProjectionMatrix();
      }

      this.renderer.setSize(this.$.threed.clientWidth, this.$.threed.clientHeight);
      this._render();
    }
  },

  _render() {
    if (this.loader === 'complete') {
      THREE.glTFShaders.update(this.scene, this.camera);
    }
    this.renderer.render(this.root, this.camera);
  },

  setCameraFromAngles(azimuthDegrees, zenithDegrees) {
    if (!this.controls || azimuthDegrees == null || zenithDegrees == null) {
      return;
    }
    this.controls.reset();
    const azimuth = (azimuthDegrees % 360) * (Math.PI / 180);
    // edge case in the top pole of the sphere (zenith = 0)
    const zenith = ((zenithDegrees % 360) === 0) ? 1.0E-15 : (zenithDegrees % 360) * (Math.PI / 180);
    const radius = this.cameraDistance;
    this.camera.position.set(
      -radius * Math.cos(azimuth) * Math.sin(zenith),
      radius * Math.cos(zenith),
      radius * Math.sin(azimuth) * Math.sin(zenith),
    );
    this.controls.update();
  },

  _animate() {
    window.requestAnimationFrame(this._animate.bind(this));
    THREE.glTFAnimator.update();
    THREE.glTFShaders.update(this.scene, this.camera);
    this.controls.update();
    this._render();
  },

  _processLoad(data) {
    const object = data.scene;

    if (data.cameras && data.cameras.length) {
      for (let i = 0; i < data.cameras.length; i++) {
        const dataCamera = data.cameras[i];
        const cameraName = dataCamera.parent.name;
        this.cameras[cameraName] = dataCamera;
      }
    }

    if (data.animations && data.animations.length) {
      for (let i = 0; i < data.animations.length; i++) {
        const animation = data.animations[i];
        animation.loop = true;
        animation.play();
        this.animations.push(animation);
      }
    }

    this._objectComposition(object);
    this.scene.add(object);
    this.$.progress.hidden = true;
    this._animate();
  },

  _objectComposition(object) {
    const rotObjectMatrix = new THREE.Matrix4();
    rotObjectMatrix.makeRotationAxis(new THREE.Vector3(0, 1, 0), Math.PI);
    object.matrix.multiply(rotObjectMatrix);
    object.rotation.setFromRotationMatrix(object.matrix);

    const box3 = new THREE.Box3();
    box3.setFromObject(object);

    const dists = new THREE.Vector3().copy(box3.max).sub(box3.min);
    const maxSize = Math.max.apply(null, [dists.x, dists.y, dists.z]);
    const scale = 1 / maxSize;
    const center = new THREE.Vector3().sub(box3.getCenter());
    const matrix = new THREE.Matrix4().identity();
    matrix.makeTranslation(center.x, center.y, center.z);
    matrix.multiplyScalar(scale);
    object.applyMatrix(matrix);

    const prepare = function(obj, hasShadow) {
      if (obj.geometry) {
        obj.castShadow = hasShadow;
        obj.geometry.computeFaceNormals();
        obj.geometry.computeVertexNormals();
        obj.geometry.computeBoundingSphere();
        obj.geometry.elementsNeedUpdate = true;
        obj.geometry.verticesNeedUpdate = true;
        obj.geometry.normalsNeedUpdate = true;
      }
      if (obj.material && obj.material.bumpMap) {
        obj.material.bumpScale = scale;
      }

    };
    prepare(object, true);
    object.traverse((child) => {
      prepare(child, true);
    });
  },

  _cameraComposition() {
    this.sphericalCoords = [225, 45];
    this.camera.fov = 25;
    this.cameraDistance = 4;
  },
});
