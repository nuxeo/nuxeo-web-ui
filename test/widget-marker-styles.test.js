/**
@license
©2026 Hyland Software, Inc. and its affiliates. All rights reserved.
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
import { Polymer } from '@polymer/polymer/polymer-legacy.js';
import { html as polymerHtml } from '@polymer/polymer/lib/utils/html-tag.js';
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import '../themes/base.js';

// A host that pulls in the shared `nuxeo-styles` module, with one widget declared through each
// marker so the layout rules can be compared side by side (WEBUI-2229).
Polymer({
  is: 'nuxeo-widget-marker-test-host',
  _template: polymerHtml`
    <style include="nuxeo-styles"></style>

    <div data-widget>
      <div class="multiline" id="markerMultiline">value</div>
      <div id="markerPlain">value</div>
    </div>

    <div role="widget">
      <div class="multiline" id="legacyMultiline">value</div>
      <div id="legacyPlain">value</div>
    </div>
  `,
});

suite('widget marker styles', () => {
  let host;

  setup(async () => {
    host = await fixture(html`<nuxeo-widget-marker-test-host></nuxeo-widget-marker-test-host>`);
    await flush();
  });

  test('Should preserve line breaks in multiline children of a data-widget', () => {
    const legacy = getComputedStyle(host.$.legacyMultiline).whiteSpace;
    // guards the comparison below: if the legacy rule ever stops applying, the assertion is void
    expect(legacy).to.be.equals('pre-line');
    expect(getComputedStyle(host.$.markerMultiline).whiteSpace).to.be.equals(legacy);
  });

  test('Should break long words in children of a data-widget', () => {
    const legacy = getComputedStyle(host.$.legacyPlain);
    const marker = getComputedStyle(host.$.markerPlain);
    expect(legacy.overflowWrap).to.be.equals('break-word');
    expect(marker.overflowWrap).to.be.equals(legacy.overflowWrap);
    expect(marker.wordBreak).to.be.equals(legacy.wordBreak);
    expect(marker.hyphens).to.be.equals(legacy.hyphens);
  });
});
