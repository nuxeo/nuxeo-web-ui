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
import '../elements/nuxeo-data-list/nuxeo-document-list-item.js';

suite('nuxeo-document-list-item', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-list-item></nuxeo-document-list-item>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default selected to false', () => {
      expect(element.selected).to.be.false;
    });

    test('should default offset to -1', () => {
      expect(element.offset).to.equal(-1);
    });

    test('should default selectedItems to empty array', () => {
      expect(element.selectedItems).to.deep.equal([]);
    });

    // ELEMENTS-1616: consistent crossorigin across all elements that render the
    // same thumbnail URL, otherwise a plain <img> poisons Chrome's cache and the
    // crossorigin <img> (list/thumbnail view) fails to load under S3 direct download.
    test('renders the thumbnail img with crossorigin="anonymous"', () => {
      const img = element.shadowRoot.querySelector('.thumbnailContainer img');
      expect(img).to.be.ok;
      expect(img.getAttribute('crossorigin')).to.equal('anonymous');
    });
  });

  suite('_thumbnail', () => {
    test('should return thumbnail URL for doc with thumbnail context', () => {
      const doc = { uid: '1', contextParameters: { thumbnail: { url: 'http://example.com/thumb.jpg' } } };
      const result = element._thumbnail(doc);
      expect(result).to.include('http://example.com/thumb.jpg');
    });

    test('should return empty string when no thumbnail', () => {
      expect(element._thumbnail(null)).to.equal('');
    });

    test('should return empty string when no context parameters', () => {
      expect(element._thumbnail({ uid: '1' })).to.equal('');
    });
  });

  suite('_selectedItemsChanged', () => {
    test('should enable selectionMode when items exist', () => {
      element.selectedItems = [{ uid: '1' }];
      element._selectedItemsChanged();
      expect(element.selectionMode).to.be.true;
    });

    test('should disable selectionMode when no items', () => {
      element.selectedItems = [];
      element._selectedItemsChanged();
      expect(element.selectionMode).to.be.false;
    });

    test('should set selectionMode falsy when selectedItems is null', () => {
      element.selectedItems = null;
      element._selectedItemsChanged();
      expect(element.selectionMode).to.not.be.ok;
    });
  });

  suite('isFollowRedirectEnabled', () => {
    let saved;

    setup(() => {
      window.Nuxeo = window.Nuxeo || {};
      window.Nuxeo.UI = window.Nuxeo.UI || {};
      window.Nuxeo.UI.config = window.Nuxeo.UI.config || {};
      window.Nuxeo.UI.config.url = window.Nuxeo.UI.config.url || {};
      saved = window.Nuxeo.UI.config.url.followRedirect;
    });

    teardown(() => {
      if (saved === undefined) {
        delete window.Nuxeo.UI.config.url.followRedirect;
      } else {
        window.Nuxeo.UI.config.url.followRedirect = saved;
      }
    });

    test('returns true when followRedirect is true', () => {
      window.Nuxeo.UI.config.url.followRedirect = 'true';
      expect(element.isFollowRedirectEnabled()).to.be.true;
    });

    test('returns false when followRedirect is not true', () => {
      window.Nuxeo.UI.config.url.followRedirect = '0';
      expect(element.isFollowRedirectEnabled()).to.be.false;
    });
  });

  suite('_thumbnail', () => {
    test('skips clientReason when follow redirect enabled', () => {
      window.Nuxeo = window.Nuxeo || {};
      window.Nuxeo.UI = window.Nuxeo.UI || {};
      window.Nuxeo.UI.config = window.Nuxeo.UI.config || {};
      window.Nuxeo.UI.config.url = { followRedirect: 'true' };
      const doc = {
        uid: '1',
        contextParameters: { thumbnail: { url: 'http://example.com/x.png' } },
      };
      expect(element._thumbnail(doc)).to.equal('http://example.com/x.png');
    });

    test('uses & when URL has query string', () => {
      window.Nuxeo = window.Nuxeo || {};
      window.Nuxeo.UI = window.Nuxeo.UI || {};
      window.Nuxeo.UI.config = window.Nuxeo.UI.config || {};
      window.Nuxeo.UI.config.url = { followRedirect: 'false' };
      const doc = {
        uid: '1',
        contextParameters: { thumbnail: { url: 'http://example.com/x.png?foo=1' } },
      };
      expect(element._thumbnail(doc)).to.include('&clientReason=view');
    });
  });

  suite('_computeTitle', () => {
    test('concatenates title and i18n', () => {
      expect(element._computeTitle({ title: 'Doc' })).to.equal('Doccommand.select');
    });
  });

  suite('handleClick', () => {
    setup(() => {
      element.doc = { uid: 'd' };
      element.index = 1;
    });

    test('toggles in selection mode', () => {
      element.selectionMode = true;
      sinon.spy(element, '_toogleSelect');
      element.handleClick({ detail: { sourceEvent: {} } });
      expect(element._toogleSelect).to.have.been.called;
      element._toogleSelect.restore();
    });

    test('fires navigate without modifiers', () => {
      element.selectionMode = false;
      sinon.spy(element, 'fire');
      element.handleClick({ ctrlKey: false, shiftKey: false, metaKey: false, button: 0 });
      expect(element.fire).to.have.been.calledWith('navigate', { item: element.doc, index: 1 });
      element.fire.restore();
    });

    test('skips navigate when shiftKey', () => {
      element.selectionMode = false;
      sinon.spy(element, 'fire');
      element.handleClick({ ctrlKey: false, shiftKey: true, metaKey: false, button: 0 });
      expect(element.fire).to.not.have.been.called;
      element.fire.restore();
    });
  });

  suite('_onCheckBoxTap', () => {
    test('delegates to _toogleSelect', () => {
      sinon.spy(element, '_toogleSelect');
      element._onCheckBoxTap({ detail: { sourceEvent: {} } });
      expect(element._toogleSelect).to.have.been.called;
      element._toogleSelect.restore();
    });
  });

  suite('_toogleSelect', () => {
    test('toggles selected and fires with shiftKey from sourceEvent', () => {
      element.selected = false;
      element.index = 2;
      sinon.spy(element, 'fire');
      const ev = { detail: { sourceEvent: { shiftKey: true } } };
      element._toogleSelect(ev);
      expect(element.selected).to.be.true;
      expect(element.fire).to.have.been.calledWith('selected', { index: 2, shiftKey: true });
      element.fire.restore();
    });
  });

  suite('_handleKeydown', () => {
    test('Enter on non-checkbox stops propagation and clicks target', () => {
      const clickSpy = sinon.spy();
      const target = { tagName: 'A', click: clickSpy };
      const ev = { key: 'Enter', stopPropagation: sinon.stub(), currentTarget: target };
      element._handleKeydown(ev);
      expect(ev.stopPropagation).to.have.been.called;
      expect(clickSpy).to.have.been.called;
    });

    test('Enter on paper-icon-button does not click', () => {
      const target = { tagName: 'PAPER-ICON-BUTTON', click: sinon.spy() };
      const ev = { key: 'Enter', stopPropagation: sinon.stub(), currentTarget: target };
      element._handleKeydown(ev);
      expect(target.click).to.not.have.been.called;
    });

    test('non-Enter does nothing', () => {
      const ev = { key: 'Escape', stopPropagation: sinon.stub(), currentTarget: { click: sinon.spy() } };
      element._handleKeydown(ev);
      expect(ev.stopPropagation).to.not.have.been.called;
    });
  });
});
