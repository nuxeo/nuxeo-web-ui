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
import '../elements/nuxeo-admin/nuxeo-user-group-management-page.js';

suite('nuxeo-user-group-management-page', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-user-group-management-page></nuxeo-user-group-management-page>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('_displayLatest', () => {
    test('should resolve to true after _observePage runs with page=search', () => {
      element.page = 'search';
      element._observePage();
      expect(element._displayLatest).to.be.true;
    });

    test('should resolve to false after _observePage runs with another page', () => {
      element.page = 'manage-user';
      element._observePage();
      expect(element._displayLatest).to.be.false;
    });
  });

  suite('_routeParamsChanged', () => {
    test('should set entity from route params with two segments', () => {
      element._routeParamsChanged(['user', 'jdoe']);
      expect(element.entity).to.deep.equal({ type: 'user', id: 'jdoe' });
    });

    test('should set entity from route params with group segments', () => {
      element._routeParamsChanged(['group', 'admins']);
      expect(element.entity).to.deep.equal({ type: 'group', id: 'admins' });
    });

    test('should reset entity to empty object when route is empty', () => {
      element.entity = { type: 'user', id: 'jdoe' };
      element._routeParamsChanged([]);
      expect(element.entity).to.deep.equal({});
    });

    test('should reset entity to empty object when route has only one segment', () => {
      element.entity = { type: 'user', id: 'jdoe' };
      element._routeParamsChanged(['user']);
      expect(element.entity).to.deep.equal({});
    });

    test('should reset entity to empty object when route is undefined', () => {
      element.entity = { type: 'user', id: 'jdoe' };
      element._routeParamsChanged(undefined);
      expect(element.entity).to.deep.equal({});
    });
  });

  suite('_entityChanged', () => {
    test('should return early when not visible', () => {
      element.visible = false;
      const stub = sinon.stub(element, '$$');
      element._entityChanged();
      expect(stub).to.not.have.been.called;
      stub.restore();
    });

    test('should return early when management element is not present', () => {
      element.visible = true;
      sinon.stub(element, '$$').returns(null);
      // Should not throw
      element._entityChanged();
      element.$$.restore();
    });

    test('should set group selection on management when entity type is group', () => {
      const management = { selectedGroup: null, page: null };
      element.visible = true;
      sinon.stub(element, '$$').withArgs('nuxeo-user-group-management').returns(management);
      element.entity = { type: 'group', id: 'admins' };
      element._entityChanged();
      expect(management.selectedGroup).to.equal('admins');
      expect(management.page).to.equal('manage-group');
      element.$$.restore();
    });

    test('should set user selection on management when entity type is user', () => {
      const management = { selectedUser: null, page: null };
      element.visible = true;
      sinon.stub(element, '$$').withArgs('nuxeo-user-group-management').returns(management);
      element.entity = { type: 'user', id: 'jdoe' };
      element._entityChanged();
      expect(management.selectedUser).to.equal('jdoe');
      expect(management.page).to.equal('manage-user');
      element.$$.restore();
    });

    test('should reset selectedGroup before reassigning so the observer re-fetches (WEBUI-1898)', () => {
      const assigned = [];
      const management = { page: null };
      Object.defineProperty(management, 'selectedGroup', {
        get() {
          return this._selectedGroup;
        },
        set(v) {
          this._selectedGroup = v;
          assigned.push(v);
        },
      });
      // Simulate returning to a group that is already selected.
      management.selectedGroup = 'admins';
      assigned.length = 0;
      element.visible = true;
      sinon.stub(element, '$$').withArgs('nuxeo-user-group-management').returns(management);
      element.entity = { type: 'group', id: 'admins' };
      // Ignore assignments from the observer fired by the line above; assert on an explicit call.
      assigned.length = 0;
      element._entityChanged();
      // null reset then reassignment forces the groupname observer to fire again.
      expect(assigned).to.deep.equal([null, 'admins']);
      expect(management.selectedGroup).to.equal('admins');
      expect(management.page).to.equal('manage-group');
      element.$$.restore();
    });

    test('should reset selectedUser before reassigning so the observer re-fetches (WEBUI-1898)', () => {
      const assigned = [];
      const management = { page: null };
      Object.defineProperty(management, 'selectedUser', {
        get() {
          return this._selectedUser;
        },
        set(v) {
          this._selectedUser = v;
          assigned.push(v);
        },
      });
      management.selectedUser = 'jdoe';
      assigned.length = 0;
      element.visible = true;
      sinon.stub(element, '$$').withArgs('nuxeo-user-group-management').returns(management);
      element.entity = { type: 'user', id: 'jdoe' };
      assigned.length = 0;
      element._entityChanged();
      expect(assigned).to.deep.equal([null, 'jdoe']);
      expect(management.selectedUser).to.equal('jdoe');
      expect(management.page).to.equal('manage-user');
      element.$$.restore();
    });

    test('should reset to search page when entity is empty', () => {
      const searchEl = { _searchTermChanged: sinon.spy() };
      const management = { $$: sinon.stub().withArgs('nuxeo-user-group-search').returns(searchEl) };
      element.visible = true;
      sinon.stub(element, '$$').withArgs('nuxeo-user-group-management').returns(management);
      // Assign directly to bypass the observer that would also invoke _entityChanged.
      element.entity = {};
      searchEl._searchTermChanged.resetHistory();
      element._entityChanged();
      expect(searchEl._searchTermChanged).to.have.been.called;
      expect(element.page).to.equal('search');
      element.$$.restore();
    });
  });

  suite('_visibleChanged', () => {
    test('should call _entityChanged via async when visible', () => {
      const entityChangedSpy = sinon.spy(element, '_entityChanged');
      const asyncStub = sinon.stub(element, 'async').callsFake((fn) => fn());
      // Element starts not visible; reset spies after assignment so we only count this invocation.
      element.visible = true;
      asyncStub.resetHistory();
      entityChangedSpy.resetHistory();
      element._visibleChanged();
      expect(asyncStub).to.have.been.calledOnce;
      expect(entityChangedSpy).to.have.been.called;
      asyncStub.restore();
      entityChangedSpy.restore();
    });

    test('should not call async when not visible', () => {
      const asyncStub = sinon.stub(element, 'async');
      element.visible = false;
      asyncStub.resetHistory();
      element._visibleChanged();
      expect(asyncStub).to.not.have.been.called;
      asyncStub.restore();
    });
  });

  suite('_handleUGMgoHome', () => {
    test('should reset entity and navigate to user-group-management', () => {
      const navigate = sinon.spy();
      const pageRouteFn = sinon.stub().returns('/some/path');
      element.router = { page: pageRouteFn, navigate };
      element.entity = { type: 'user', id: 'jdoe' };
      element._handleUGMgoHome();
      expect(element.entity).to.deep.equal({});
      expect(pageRouteFn).to.have.been.calledWith('user-group-management');
      expect(navigate).to.have.been.calledWith('/some/path');
    });
  });

  suite('_handleUGMmanageUser', () => {
    test('should set entity and navigate to user url', () => {
      const navigate = sinon.spy();
      const pageRouteFn = sinon.stub().returns('/u/jdoe');
      element.router = { page: pageRouteFn, navigate };
      element._handleUGMmanageUser({ detail: { user: 'jdoe' } });
      expect(element.entity).to.deep.equal({ type: 'user', id: 'jdoe' });
      expect(pageRouteFn).to.have.been.calledWith('user-group-management/user/jdoe');
      expect(navigate).to.have.been.calledWith('/u/jdoe');
    });

    test('should encode user id with special characters', () => {
      const navigate = sinon.spy();
      const pageRouteFn = sinon.stub().returns('/u/encoded');
      element.router = { page: pageRouteFn, navigate };
      element._handleUGMmanageUser({ detail: { user: 'john doe@example.com' } });
      expect(element.entity.id).to.equal('john doe@example.com');
      expect(pageRouteFn).to.have.been.calledWith(
        `user-group-management/user/${encodeURIComponent('john doe@example.com')}`,
      );
    });
  });

  suite('_handleUGMmanageGroup', () => {
    test('should set entity and navigate to group url', () => {
      const navigate = sinon.spy();
      const pageRouteFn = sinon.stub().returns('/g/admins');
      element.router = { page: pageRouteFn, navigate };
      element._handleUGMmanageGroup({ detail: { group: 'admins' } });
      expect(element.entity).to.deep.equal({ type: 'group', id: 'admins' });
      expect(pageRouteFn).to.have.been.calledWith('user-group-management/group/admins');
      expect(navigate).to.have.been.calledWith('/g/admins');
    });

    test('should encode group id with special characters', () => {
      const navigate = sinon.spy();
      const pageRouteFn = sinon.stub().returns('/g/encoded');
      element.router = { page: pageRouteFn, navigate };
      element._handleUGMmanageGroup({ detail: { group: 'group/with/slashes' } });
      expect(element.entity.id).to.equal('group/with/slashes');
      expect(pageRouteFn).to.have.been.calledWith(
        `user-group-management/group/${encodeURIComponent('group/with/slashes')}`,
      );
    });
  });

  suite('_observePage', () => {
    test('should set _displayLatest to true when page is search', () => {
      element.page = 'search';
      element._observePage();
      expect(element._displayLatest).to.be.true;
    });

    test('should set _displayLatest to false when page is not search', () => {
      element.page = 'manage-user';
      element._observePage();
      expect(element._displayLatest).to.be.false;
    });
  });
});
