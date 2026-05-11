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
import '../elements/nuxeo-drive-desktop-packages.js';

suite('nuxeo-drive-desktop-packages', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-drive-desktop-packages></nuxeo-drive-desktop-packages>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should have undefined packages when _tp is not set', () => {
      expect(element.packages).to.be.undefined;
    });
  });

  suite('_computeUrls', () => {
    test('should return undefined when tp is falsy', () => {
      expect(element._computeUrls(null)).to.be.undefined;
      expect(element._computeUrls(undefined)).to.be.undefined;
      expect(element._computeUrls('')).to.be.undefined;
    });

    test('should return three packages when tp is truthy', () => {
      const pkgs = element._computeUrls('some-platform');
      expect(pkgs).to.be.an('array').with.lengthOf(3);
    });

    test('should include Linux package', () => {
      const pkgs = element._computeUrls('some-platform');
      const linux = pkgs.find((p) => p.platform === 'Linux');
      expect(linux).to.exist;
      expect(linux.name).to.equal('nuxeo-drive-x86_64.AppImage');
      expect(linux.url).to.include('nuxeo-drive-x86_64.AppImage');
    });

    test('should include macOS package', () => {
      const pkgs = element._computeUrls('some-platform');
      const mac = pkgs.find((p) => p.platform === 'macOS');
      expect(mac).to.exist;
      expect(mac.name).to.equal('nuxeo-drive.dmg');
      expect(mac.url).to.include('nuxeo-drive.dmg');
    });

    test('should include Windows package', () => {
      const pkgs = element._computeUrls('some-platform');
      const win = pkgs.find((p) => p.platform === 'Windows');
      expect(win).to.exist;
      expect(win.name).to.equal('nuxeo-drive.exe');
      expect(win.url).to.include('nuxeo-drive.exe');
    });

    test('should use community.nuxeo.com base URL', () => {
      const pkgs = element._computeUrls('some-platform');
      pkgs.forEach((pkg) => {
        expect(pkg.url).to.include('https://community.nuxeo.com/static/drive-updates');
      });
    });
  });
});
