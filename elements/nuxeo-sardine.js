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
/**
`nuxeo-sardine`
@group Nuxeo UI
@element nuxeo-sardine
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '@polymer/polymer/polymer-legacy.js';

import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { _Suggester } from './nuxeo-suggester/nuxeo-suggester.js';
Polymer({
  _template: html`
    <style>
      :host([hidden]) {
        display: none;
      }
      #sardine {
        position: fixed;
        width: 128px;
        z-index: 9999;
      }

      #sardine img {
        position: relative;
        top: 16px;
        width: 100%;
        height: 100%;
        animation: upDown 5s linear infinite;
      }

      #wrapper {
        animation: rotate 5s linear infinite;
      }

      #feeling {
        position: absolute;
        top: -8px;
        left: 16px;
        font-size: 14px;
      }

      .left {
        transform: scaleX(-1);
      }

      .right {
        transform: scaleX(1);
      }

      @keyframes upDown {
        0%    { transform: translateY(0); }
        25%   { transform: translateY(-8px); }
        50%   { transform: translateY(0); }
        75%   { transform: translateY(8px); }
        100%  { transform: translateY(0);}
      }

      @keyframes rotate {
        0%    { transform: rotate(4deg); }
        12.5% { transform: rotate(2deg); }
        25%   { transform: rotate(0deg); }
        37.5% { transform: rotate(-2deg); }
        50%   { transform: rotate(-4deg); }
        62.5% { transform: rotate(-2deg); }
        75%   { transform: rotate(0deg); }
        87.5% { transform: rotate(2deg); }
        100%  { transform: rotate(4deg); }
      }
    </style>

    <div id="sardine">
      <div id="wrapper">
        <span id="feeling">[[feeling]]</span>
        <template is="dom-if" if="[[!hidden]]">
          <img src="images/sardine.png">
        </template>
      </div>
    </div>
`,

  is: 'nuxeo-sardine',

  properties: {
    hidden: {
      type: Boolean,
      value: false,
      notify: true,
      reflectToAttribute: true,
    },
    state: String,
    feeling: String,
  },

  ready: function() {
    this._onkeypress = function(e) {
      if (e.key === 'Escape') {
        this._off();
      }
    }.bind(this);
    this._onpointerout = function() {
      this._unknownLocation = true;
    }.bind(this);
    this._ondblclick = function() {
      this._off();
    }.bind(this);
    this._onpointermove = function(e) {
      if (this._idleTimeout) {
        clearTimeout(this._idleTimeout);
      }
      this._idleTimeout = setTimeout(function() {
        this.feeling = '💤';
      }.bind(this), 15000);
      this._unknownLocation = false;
      // XXX this will only capture the first touch on mobile, because the browser will reclaim the move for itself.
      // see https://developer.mozilla.org/en-US/docs/Web/Events/pointermove for more
      this._lastPointerEvent = e;
      if (this._req) {
        cancelAnimationFrame(this._req);
      }
      this._req = requestAnimationFrame(this._animate.bind(this));
    }.bind(this);
    customElements.whenDefined('nuxeo-suggester').then(function() {
      this.$.sardine.style.left = Math.random() * window.innerWidth + 'px';
      this.$.sardine.style.top = Math.random() * window.innerHeight + 'px';
      _Suggester.addCommand({
        id: 'sardine',
        trigger: {
          searchTerm: 'i love sardines!!!',
          startsWith: false,
        },
        suggestion: {
          id: 'sardine',
          icon: 'images/gift.png',
          label: 'I love sardines!!! 🐟🐟🐟💝💝💝',
        },
        run: this._on.bind(this),
      });
    }.bind(this));
  },

  _on: function() {
    this.hidden = false;
    this.$.sardine.addEventListener('dblclick', this._ondblclick);
    if (window.PointerEvent) {
      window.addEventListener('pointermove', this._onpointermove, false);
      window.addEventListener('pointerout', this._onpointerout, false);
    } else {
      window.addEventListener('mousemove', this._onpointermove, false);
      window.addEventListener('mouseout', this._onpointerout, false);
    }
    window.addEventListener('keyup', this._onkeypress, false);
  },

  _animate: function() {
    var rect = this.$.sardine.getBoundingClientRect();
    var x1 = rect.left;
    var y1 = rect.top;
    var w = rect.width;
    var h = rect.height;
    var x2 = this._lastPointerEvent.x;
    var y2 = this._lastPointerEvent.y;
    x2 = (x2 + w) > window.innerWidth ? window.innerWidth - w : x2;
    y2 = (y2 + h) > window.innerHeight ? window.innerHeight - h : y2;
    var dist = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    if (dist < 32) {
      if (this._unknownLocation) {
        this.feeling = (!this._lastPointerEvent.pointerType || this._lastPointerEvent.pointerType === 'mouse') ?
          '❗' : '😍';
      } else if (!this._lastPointerEvent.pointerType || this._lastPointerEvent.pointerType !== 'touch') {
        this.feeling = '❤️';
      }
    } else {
      this.feeling = '';
    }
    if (dist > 1) {
      var newX = this._lerp(x1, x2, 0.05);
      var newY = this._lerp(y1, y2, 0.05);
      this.$.sardine.style.left = newX + 'px';
      this.$.sardine.style.top = newY + 'px';
      x1 = this.$.sardine.getBoundingClientRect().left;
      if (!this._unknownLocation) {
        var dir = x1 < (this._lastPointerEvent.x - 32) ? 'left' : 'right';
        if (dir != this.$.sardine._dir) {
          this.$.sardine.classList.remove(this.$.sardine._dir);
          this.$.sardine.classList.add(dir);
        }
        this.$.sardine._dir = dir;
      }
      this._req = requestAnimationFrame(this._animate.bind(this));
    }
  },

  _off: function() {
    this.hidden = true;
    if (this._req) {
      cancelAnimationFrame(this._req);
    }
    if (this._idleTimeout) {
      clearTimeout(this._idleTimeout);
    }
    window.removeEventListener('pointermove', this._onpointermove, false);
    window.removeEventListener('keyup', this._onkeypress, false);
    window.removeEventListener('pointerleave', this._onpointerout);
    this.$.sardine.removeEventListener('dblclick', this._ondblclick);
  },

  _lerp: function (value1, value2, amount) {
    amount = amount < 0 ? 0 : amount;
    amount = amount > 1 ? 1 : amount;
    return value1 + (value2 - value1) * amount;
  }
});
