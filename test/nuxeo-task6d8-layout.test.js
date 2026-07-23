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
import '@webcomponents/html-imports/html-imports.min.js';
import { Polymer } from '@polymer/polymer/polymer-legacy.js';
import { fixture, html, flush } from '@nuxeo/testing-helpers';
import { LayoutBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-layout-behavior.js';
import '@nuxeo/nuxeo-elements/nuxeo-resource.js';

// The layout under test is a legacy HTML `dom-module` loaded via HTML imports.
// Expose the globals its `<script>` registration relies on before importing it.
window.Polymer = Polymer;
const _nxRoot = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
_nxRoot.Nuxeo = _nxRoot.Nuxeo || {};
_nxRoot.Nuxeo.LayoutBehavior = LayoutBehavior;

// Resolve the layout HTML relative to this test module and load it through the HTML imports polyfill.
const { url } = import.meta;
const base = url.substring(0, url.lastIndexOf('/'));
const layoutHref = `${base}/../elements/workflow/serialdocumentreview/nuxeo-task6d8-layout.html`;

function loadHtmlImport(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'import';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = (e) => reject(e);
    document.head.appendChild(link);
  });
}

suite('nuxeo-task6d8-layout', () => {
  let element;

  suiteSetup(async () => {
    await loadHtmlImport(layoutHref);
    await customElements.whenDefined('nuxeo-task6d8-layout');
  });

  setup(async () => {
    element = await fixture(html`<nuxeo-task6d8-layout></nuxeo-task6d8-layout>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
    await flush();
  });

  suite('_fetchUserParticipants', () => {
    test('should clear resolved participants when participants is undefined', async () => {
      element._resolvedUserParticipants = [{ id: 'stale' }];
      await element._fetchUserParticipants(undefined);
      expect(element._resolvedUserParticipants).to.be.an('array').that.is.empty;
    });

    test('should clear resolved participants when participants is not an array', async () => {
      element._resolvedUserParticipants = [{ id: 'stale' }];
      await element._fetchUserParticipants('user:jdoe');
      expect(element._resolvedUserParticipants).to.be.an('array').that.is.empty;
    });

    test('should clear resolved participants when there are no user actors', async () => {
      element._resolvedUserParticipants = [{ id: 'stale' }];
      const getSpy = sinon.spy(element.$.user, 'get');
      await element._fetchUserParticipants(['group:members']);
      expect(getSpy).to.not.have.been.called;
      expect(element._resolvedUserParticipants).to.be.an('array').that.is.empty;
      getSpy.restore();
    });

    test('should ignore non-string entries without throwing', async () => {
      const entity = { 'entity-type': 'user', id: 'jdoe', properties: { firstName: 'Jane', lastName: 'Doe' } };
      sinon.stub(element.$.user, 'get').resolves(entity);
      await element._fetchUserParticipants([null, 42, { foo: 'bar' }, 'user:jdoe']);
      expect(element.$.user.get).to.have.been.calledOnce;
      expect(element._resolvedUserParticipants).to.deep.equal([entity]);
      element.$.user.get.restore();
    });

    test('should resolve user entities for user actors', async () => {
      const entity = { 'entity-type': 'user', id: 'jdoe', properties: { firstName: 'Jane', lastName: 'Doe' } };
      sinon.stub(element.$.user, 'get').resolves(entity);
      await element._fetchUserParticipants(['user:jdoe']);
      expect(element._resolvedUserParticipants).to.deep.equal([entity]);
      element.$.user.get.restore();
    });

    test('should URL-encode usernames in the request path', async () => {
      const entity = { 'entity-type': 'user', id: 'a b/c' };
      const getStub = sinon.stub(element.$.user, 'get').callsFake(() => {
        expect(element.$.user.path).to.equal('/user/a%20b%2Fc');
        return Promise.resolve(entity);
      });
      await element._fetchUserParticipants(['user:a b/c']);
      expect(getStub).to.have.been.calledOnce;
      element.$.user.get.restore();
    });

    test('should fall back to the raw actor string on 404 without warning', async () => {
      const error = new Error('not found');
      error.status = 404;
      sinon.stub(element.$.user, 'get').rejects(error);
      const warnSpy = sinon.stub(console, 'warn');
      await element._fetchUserParticipants(['user:deleted']);
      expect(element._resolvedUserParticipants).to.deep.equal(['user:deleted']);
      expect(warnSpy).to.not.have.been.called;
      warnSpy.restore();
      element.$.user.get.restore();
    });

    test('should warn and fall back on unexpected non-404 errors', async () => {
      const error = new Error('internal error');
      error.status = 500;
      sinon.stub(element.$.user, 'get').rejects(error);
      const warnSpy = sinon.stub(console, 'warn');
      await element._fetchUserParticipants(['user:baduser']);
      expect(element._resolvedUserParticipants).to.deep.equal(['user:baduser']);
      expect(warnSpy).to.have.been.calledOnce;
      warnSpy.restore();
      element.$.user.get.restore();
    });

    test('should warn and fall back on statusless (network) errors', async () => {
      sinon.stub(element.$.user, 'get').rejects(new Error('network down'));
      const warnSpy = sinon.stub(console, 'warn');
      await element._fetchUserParticipants(['user:offline']);
      expect(element._resolvedUserParticipants).to.deep.equal(['user:offline']);
      expect(warnSpy).to.have.been.calledOnce;
      warnSpy.restore();
      element.$.user.get.restore();
    });

    test('should discard stale responses via request-id guard', async () => {
      const first = { 'entity-type': 'user', id: 'first' };
      const second = { 'entity-type': 'user', id: 'second' };
      sinon.stub(element.$.user, 'get').resolves(first);
      const p1 = element._fetchUserParticipants(['user:first']);
      element.$.user.get.resolves(second);
      const p2 = element._fetchUserParticipants(['user:second']);
      await Promise.all([p1, p2]);
      // Only the latest invocation should update the resolved participants.
      expect(element._resolvedUserParticipants).to.have.lengthOf(1);
      expect(element._resolvedUserParticipants[0]).to.have.property('id', 'second');
      element.$.user.get.restore();
    });

    test('should serialize concurrent invocations on the shared resource', async () => {
      const paths = [];
      sinon.stub(element.$.user, 'get').callsFake(() => {
        // Record the path each lookup requests; interleaved runs would corrupt the order.
        paths.push(element.$.user.path);
        return Promise.resolve({ 'entity-type': 'user', id: element.$.user.path });
      });
      const p1 = element._fetchUserParticipants(['user:a', 'user:b']);
      const p2 = element._fetchUserParticipants(['user:c']);
      await Promise.all([p1, p2]);
      // Serialized: first invocation's lookups (a, b) complete before the second's (c).
      expect(paths).to.deep.equal(['/user/a', '/user/b', '/user/c']);
      element.$.user.get.restore();
    });

    test('should discard in-flight results when participants are reset to empty mid-flight', async () => {
      let resolveGet;
      sinon.stub(element.$.user, 'get').returns(
        new Promise((resolve) => {
          resolveGet = resolve;
        }),
      );
      const inFlight = element._fetchUserParticipants(['user:jdoe']);
      await new Promise((r) => setTimeout(r, 0)); // let the in-flight lookup start
      element._fetchUserParticipants([]); // reset while the lookup is pending
      expect(element._resolvedUserParticipants).to.deep.equal([]);
      resolveGet({ 'entity-type': 'user', id: 'jdoe' });
      await inFlight;
      // The stale lookup must not repopulate the reset state.
      expect(element._resolvedUserParticipants).to.deep.equal([]);
      element.$.user.get.restore();
    });
  });

  suite('_hasActorType / _getActorsByType', () => {
    test('_hasActorType returns true when an actor of the type exists', () => {
      expect(element._hasActorType(['user:jdoe', 'group:members'], 'group')).to.be.true;
    });

    test('_hasActorType returns false when no actor of the type exists', () => {
      expect(element._hasActorType(['user:jdoe'], 'group')).to.be.false;
    });

    test('_hasActorType handles non-array input', () => {
      expect(element._hasActorType(undefined, 'group')).to.be.not.ok;
    });

    test('_hasActorType ignores non-string entries without throwing', () => {
      expect(() => element._hasActorType([null, 42, { x: 1 }, 'group:members'], 'group')).to.not.throw();
      expect(element._hasActorType([null, 42, 'group:members'], 'group')).to.be.true;
      expect(element._hasActorType([null, 42], 'group')).to.be.false;
    });

    test('_getActorsByType filters actors by type', () => {
      expect(element._getActorsByType(['user:jdoe', 'group:members'], 'user')).to.deep.equal(['user:jdoe']);
    });

    test('_getActorsByType handles non-array input', () => {
      expect(element._getActorsByType(undefined, 'user')).to.be.not.ok;
    });

    test('_getActorsByType ignores non-string entries without throwing', () => {
      expect(element._getActorsByType([null, 42, { x: 1 }, 'user:jdoe'], 'user')).to.deep.equal(['user:jdoe']);
    });
  });
});
