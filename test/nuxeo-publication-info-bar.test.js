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
import { config } from '@nuxeo/nuxeo-elements';
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-publication/nuxeo-publication-info-bar.js';

suite('nuxeo-publication-info-bar', () => {
  let el;

  setup(async () => {
    el = await fixture(html`<nuxeo-publication-info-bar></nuxeo-publication-info-bar>`);
    sinon.stub(el, 'i18n').callsFake((key, ...args) => (args.length ? `${key}:${args.join(',')}` : key));
    Object.defineProperty(el, 'urlFor', {
      value: sinon.stub().returns('/doc-link'),
      configurable: true,
      writable: true,
    });
    await flush();
  });

  test('_srcUrl returns null when source document is not loaded', () => {
    el._src = null;
    expect(el._srcUrl()).to.equal(null);
  });

  test('_srcUrl uses path routing when router key is not uid', () => {
    const getStub = sinon.stub(config, 'get');
    getStub.withArgs('router.key.document').returns('path');
    el._src = { path: '/default-domain/work', versionableId: 'uid-9' };
    expect(el._srcUrl()).to.equal('/doc-link');
    expect(el.urlFor).to.have.been.calledWith('document', '/default-domain/work');
    getStub.restore();
  });

  test('_srcUrl uses versionableId when router key is uid', () => {
    const getStub = sinon.stub(config, 'get');
    getStub.withArgs('router.key.document').returns('uid');
    el._src = { path: '/p', versionableId: 'uid-9' };
    expect(el._srcUrl()).to.equal('/doc-link');
    expect(el.urlFor).to.have.been.calledWith('document', 'uid-9');
    getStub.restore();
  });

  test('_infoLabel uses deleted message when source was removed', async () => {
    sinon.stub(el, '_updateSrc');
    el.set('document', { title: 'Proxy', isProxy: false });
    el.set('_srcDeleted', true);
    await flush();
    expect(el._infoLabel()).to.equal('publication.info.deleted');
    el._updateSrc.restore();
  });

  test('_infoLabel includes document title when source exists', () => {
    const proto = customElements.get('nuxeo-publication-info-bar').prototype;
    const i18nSpy = sinon.spy();
    proto._infoLabel.call({
      _srcDeleted: false,
      document: { title: 'My Proxy' },
      i18n: i18nSpy,
    });
    expect(i18nSpy).to.have.been.calledWith('publication.info', 'My Proxy');
  });

  test('_redirect fires navigate with redirect document', () => {
    el._redirectDoc = { uid: 'target-1' };
    sinon.stub(el, 'fire');
    el._redirect();
    expect(el.fire).to.have.been.calledWith('navigate', { doc: el._redirectDoc });
    el.fire.restore();
  });
});
