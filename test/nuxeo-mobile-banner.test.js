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
import '../elements/nuxeo-mobile/nuxeo-mobile-banner.js';

suite('nuxeo-mobile-banner', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-mobile-banner></nuxeo-mobile-banner>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default dismiss to false', () => {
      expect(element.dismiss).to.be.false;
    });

    test('should default isMobile to false on desktop', () => {
      // In headless Chrome, neither Android nor iOS UA
      expect(element.isMobile).to.be.false;
    });
  });

  suite('_displayBanner', () => {
    test('should return false when not mobile', () => {
      element.isMobile = false;
      element.dismiss = false;
      expect(element._displayBanner()).to.be.false;
    });

    test('should return true when mobile and not dismissed', () => {
      element.isMobile = true;
      element.dismiss = false;
      expect(element._displayBanner()).to.be.true;
    });

    test('should return false when dismissed', () => {
      element.isMobile = true;
      element.dismiss = true;
      expect(element._displayBanner()).to.be.false;
    });
  });

  suite('_dismiss', () => {
    test('should set dismiss to true', () => {
      element._dismiss();
      expect(element.dismiss).to.be.true;
    });
  });

  suite('_computeUrl', () => {
    test('should return undefined when no baseUrl', () => {
      element.baseUrl = null;
      expect(element._computeUrl()).to.be.undefined;
    });

    test('should return android URL for android device', () => {
      element.baseUrl = 'https://myserver.com';
      element.isAndroid = true;
      element.isIOS = false;
      element.document = { repository: 'default', uid: 'doc-1' };
      const url = element._computeUrl();
      expect(url).to.include('android-app://');
      expect(url).to.include('doc-1');
    });

    test('should return nuxeo URL for iOS device', () => {
      element.baseUrl = 'https://myserver.com';
      element.isAndroid = false;
      element.isIOS = true;
      element.document = { repository: 'default', uid: 'doc-1' };
      const url = element._computeUrl();
      expect(url).to.include('nuxeo://');
      expect(url).to.include('doc-1');
    });
  });
});
