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
import { fixture, html } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-liveconnect-google-drive-link.js';

suite('nuxeo-liveconnect-google-drive-link', () => {
  let element;

  setup(async () => {
    element = await fixture(html`<nuxeo-liveconnect-google-drive-link></nuxeo-liveconnect-google-drive-link>`);
  });

  suite('_openPicker', () => {
    test('should prevent default and open provider picker', () => {
      const event = { preventDefault: sinon.spy() };
      const provider = { openPicker: sinon.stub() };
      element.$ = { provider };
      element._openPicker(event);
      expect(event.preventDefault).to.have.been.calledOnce;
      expect(provider.openPicker).to.have.been.calledOnce;
    });
  });
});
