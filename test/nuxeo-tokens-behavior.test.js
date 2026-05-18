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
import { TokenBehavior } from '../elements/nuxeo-cloud-services/nuxeo-tokens-behavior.js';

// The actual behavior mixin is the last element in the array
const behavior = TokenBehavior[TokenBehavior.length - 1];

suite('TokenBehavior', () => {
  let ctx;
  let mockResource;

  setup(() => {
    ctx = Object.create(behavior);
    ctx.i18n = sinon.stub().callsFake((key) => key);
    ctx.notify = sinon.stub();
    ctx.formatDate = sinon.stub().callsFake((date) => date);
    ctx.tokens = [];

    mockResource = {
      path: '',
      data: null,
      get: sinon.stub().resolves({ entries: [{ id: 1 }, { id: 2 }] }),
      remove: sinon.stub().resolves(),
      put: sinon.stub().resolves(),
    };

    // Override the resource getter to return our mock
    Object.defineProperty(ctx, 'resource', { get: () => mockResource });
  });

  suite('refresh', () => {
    test('should call resource.get and update tokens', async () => {
      ctx.path = '/api/tokens';
      await ctx.refresh();
      expect(mockResource.path).to.equal('/api/tokens');
      expect(mockResource.get).to.have.been.called;
    });

    test('should use getDefaultPath when path is not set', () => {
      ctx.path = null;
      ctx.getDefaultPath = sinon.stub().returns('/default/path');
      ctx.refresh();
      expect(mockResource.path).to.equal('/default/path');
    });
  });

  suite('_editEntry', () => {
    test('should set selected entry as deep copy and toggle dialog', () => {
      const item = { id: 1, name: 'token1' };
      const dialog = { toggle: sinon.spy() };
      ctx.$ = { dialog };
      ctx._set_selectedEntry = sinon.stub();

      ctx._editEntry({ target: { parentNode: { item } } });

      expect(ctx._set_selectedEntry).to.have.been.called;
      const arg = ctx._set_selectedEntry.firstCall.args[0];
      expect(arg).to.deep.equal(item);
      // Verify it's a deep copy (not same reference)
      expect(arg).to.not.equal(item);
      expect(dialog.toggle).to.have.been.called;
    });
  });

  suite('_deleteEntry', () => {
    test('should call resource.remove when confirmed', async () => {
      const item = { id: 1, nuxeoLogin: 'user1' };
      ctx.getDeletePath = sinon.stub().returns('/api/tokens');
      ctx.refresh = sinon.stub();
      sinon.stub(window, 'confirm').returns(true);

      await ctx._deleteEntry({ target: { parentNode: { item } } });

      expect(mockResource.path).to.equal('/api/tokens/user/user1');
      expect(mockResource.remove).to.have.been.called;
      window.confirm.restore();
    });

    test('should not call resource.remove when not confirmed', () => {
      const item = { id: 1, nuxeoLogin: 'user1' };
      sinon.stub(window, 'confirm').returns(false);

      ctx._deleteEntry({ target: { parentNode: { item } } });

      expect(mockResource.remove).to.not.have.been.called;
      window.confirm.restore();
    });

    test('should notify when remove fails', async () => {
      const item = { id: 1, nuxeoLogin: 'user1' };
      ctx.getDeletePath = sinon.stub().returns('/api/tokens');
      mockResource.remove = sinon.stub().rejects(new Error('fail'));
      sinon.stub(window, 'confirm').returns(true);

      ctx._deleteEntry({ target: { parentNode: { item } } });
      await mockResource.remove.returnValues[0].catch(() => {});

      expect(ctx.notify).to.have.been.called;
      window.confirm.restore();
    });
  });

  suite('_save', () => {
    test('should validate form and call resource.put when valid', async () => {
      const dialog = { toggle: sinon.spy() };
      const form = { validate: sinon.stub().returns(true) };
      ctx.$ = { dialog, form };
      ctx._selectedEntry = { nuxeoLogin: 'user1', creationDate: '2024-01-01' };
      ctx.getUpdatePath = sinon.stub().returns('/api/tokens');
      ctx.refresh = sinon.stub();

      await ctx._save();

      expect(form.validate).to.have.been.called;
      expect(mockResource.put).to.have.been.called;
      expect(mockResource.path).to.equal('/api/tokens/user/user1');
    });

    test('should not call resource.put when form is invalid', () => {
      const form = { validate: sinon.stub().returns(false) };
      ctx.$ = { form };
      ctx._selectedEntry = { nuxeoLogin: 'user1' };

      ctx._save();

      expect(mockResource.put).to.not.have.been.called;
    });

    test('should notify with fallback message when put fails without message', async () => {
      const dialog = { toggle: sinon.spy() };
      const form = { validate: sinon.stub().returns(true) };
      ctx.$ = { dialog, form };
      ctx._selectedEntry = { nuxeoLogin: 'user1', creationDate: '2024-01-01' };
      ctx.getUpdatePath = sinon.stub().returns('/api/tokens');
      mockResource.put = sinon.stub().rejects({ message: '' });

      ctx._save();
      await mockResource.put.returnValues[0].catch(() => {});

      expect(ctx.notify).to.have.been.called;
    });
  });

  suite('getDefaultPath', () => {
    test('should throw not implemented error', () => {
      expect(() => ctx.getDefaultPath()).to.throw('not implemented');
    });
  });
});
