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
import '../elements/nuxeo-admin/nuxeo-analytics.js';

suite('nuxeo-analytics', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-analytics></nuxeo-analytics>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should have visible property', () => {
      expect(element).to.have.property('visible');
    });

    test('should have selected property', () => {
      expect(element).to.have.property('selected');
    });
  });

  suite('ready', () => {
    test('should have set up a paper-listbox', () => {
      const listbox = element.$$('paper-listbox');
      expect(listbox).to.exist;
    });
  });

  suite('keyboard navigation (via listbox)', () => {
    test('should prevent ArrowUp default', () => {
      const listbox = element.$$('paper-listbox');
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
      const prevented = !listbox.dispatchEvent(event);
      expect(prevented).to.be.true;
    });

    test('should prevent ArrowDown default', () => {
      const listbox = element.$$('paper-listbox');
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
      const prevented = !listbox.dispatchEvent(event);
      expect(prevented).to.be.true;
    });

    test('should call selectPrevious on ArrowLeft', () => {
      const listbox = element.$$('paper-listbox');
      sinon.spy(listbox, 'selectPrevious');
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
      listbox.dispatchEvent(event);
      expect(listbox.selectPrevious).to.have.been.calledOnce;
      listbox.selectPrevious.restore();
    });

    test('should call selectNext on ArrowRight', () => {
      const listbox = element.$$('paper-listbox');
      sinon.spy(listbox, 'selectNext');
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      listbox.dispatchEvent(event);
      expect(listbox.selectNext).to.have.been.calledOnce;
      listbox.selectNext.restore();
    });
  });
});
