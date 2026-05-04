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
import '../elements/nuxeo-collections/nuxeo-collection-move-up-action.js';
import '../elements/nuxeo-collections/nuxeo-collection-move-down-action.js';
import '../elements/nuxeo-collections/nuxeo-collection-move-top-action.js';
import '../elements/nuxeo-collections/nuxeo-collection-move-bottom-action.js';

suite('nuxeo-collection-move-up-action', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-collection-move-up-action></nuxeo-collection-move-up-action>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default tooltipPosition to bottom', () => {
      expect(element.tooltipPosition).to.equal('bottom');
    });

    test('should default showLabel to false', () => {
      expect(element.showLabel).to.be.false;
    });
  });

  suite('_isAvailable', () => {
    test('should return false when members is null', () => {
      element.members = null;
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false when members is empty', () => {
      element.members = [];
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false when only one member in allMembers', () => {
      // Set allMembers first to avoid observer crash
      element.allMembers = [{ uid: 'a' }];
      element.members = [{ uid: 'a' }];
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false when member is first in allMembers', () => {
      element.allMembers = [{ uid: 'a' }, { uid: 'b' }];
      element.members = [{ uid: 'a' }];
      expect(element._isAvailable()).to.be.false;
    });

    test('should return true when member is not first in allMembers', () => {
      element.allMembers = [{ uid: 'a' }, { uid: 'b' }];
      element.members = [{ uid: 'b' }];
      expect(element._isAvailable()).to.be.true;
    });

    test('should return false when multiple members selected', () => {
      element.allMembers = [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }];
      element.members = [{ uid: 'a' }, { uid: 'b' }];
      expect(element._isAvailable()).to.be.false;
    });
  });

  suite('_computeLabel', () => {
    test('should return move up label', () => {
      expect(element._computeLabel()).to.equal('collections.moveUp');
    });
  });
});

suite('nuxeo-collection-move-down-action', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-collection-move-down-action></nuxeo-collection-move-down-action>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_isAvailable', () => {
    test('should return false when members is null', () => {
      element.members = null;
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false when member is last in allMembers', () => {
      element.allMembers = [{ uid: 'a' }, { uid: 'b' }];
      element.members = [{ uid: 'b' }];
      expect(element._isAvailable()).to.be.false;
    });

    test('should return true when member is not last in allMembers', () => {
      element.allMembers = [{ uid: 'a' }, { uid: 'b' }];
      element.members = [{ uid: 'a' }];
      expect(element._isAvailable()).to.be.true;
    });
  });
});

suite('nuxeo-collection-move-top-action', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-collection-move-top-action></nuxeo-collection-move-top-action>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_isAvailable', () => {
    test('should return false when members is null', () => {
      element.members = null;
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false when member is first in allMembers', () => {
      element.allMembers = [{ uid: 'a' }, { uid: 'b' }];
      element.members = [{ uid: 'a' }];
      expect(element._isAvailable()).to.be.false;
    });

    test('should return true when member is not first', () => {
      element.allMembers = [{ uid: 'a' }, { uid: 'b' }];
      element.members = [{ uid: 'b' }];
      expect(element._isAvailable()).to.be.true;
    });
  });
});

suite('nuxeo-collection-move-bottom-action', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-collection-move-bottom-action></nuxeo-collection-move-bottom-action>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_isAvailable', () => {
    test('should return false when members is null', () => {
      element.members = null;
      expect(element._isAvailable()).to.be.false;
    });

    test('should return false when member is last in allMembers', () => {
      element.allMembers = [{ uid: 'a' }, { uid: 'b' }];
      element.members = [{ uid: 'b' }];
      expect(element._isAvailable()).to.be.false;
    });

    test('should return true when member is not last', () => {
      element.allMembers = [{ uid: 'a' }, { uid: 'b' }];
      element.members = [{ uid: 'a' }];
      expect(element._isAvailable()).to.be.true;
    });
  });
});
