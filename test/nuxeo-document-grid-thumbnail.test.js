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
import '../elements/nuxeo-data-grid/nuxeo-document-grid-thumbnail.js';

suite('nuxeo-document-grid-thumbnail', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-document-grid-thumbnail></nuxeo-document-grid-thumbnail>`);
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

    // ELEMENTS-1616: a failed (cross-origin) thumbnail should fall back to a
    // transparent pixel instead of a broken-image icon. Fire the real error
    // event so the on-error="_onError" template wiring is exercised too.
    test('renders a transparent pixel when a thumbnail fails to load', () => {
      const img = element.shadowRoot.querySelector('.thumbnailContainer img');
      img.dispatchEvent(new Event('error'));
      expect(img.src.startsWith('data:image/png;base64,')).to.be.true;
    });
  });

  suite('_thumbnail', () => {
    test('should return thumbnail URL with clientReason for doc with uid', () => {
      const doc = { uid: '1', contextParameters: { thumbnail: { url: 'http://example.com/thumb.jpg' } } };
      const result = element._thumbnail(doc);
      expect(result).to.include('http://example.com/thumb.jpg');
      expect(result).to.include('clientReason=view');
    });

    test('should return empty string when no thumbnail context', () => {
      const doc = { uid: '1', contextParameters: {} };
      expect(element._thumbnail(doc)).to.equal('');
    });

    test('should return empty string when doc is null', () => {
      expect(element._thumbnail(null)).to.equal('');
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

    test('returns true when followRedirect is string true', () => {
      window.Nuxeo.UI.config.url.followRedirect = 'true';
      expect(element.isFollowRedirectEnabled()).to.be.true;
    });

    test('returns true when followRedirect is TRUE in another case', () => {
      window.Nuxeo.UI.config.url.followRedirect = 'TRUE';
      expect(element.isFollowRedirectEnabled()).to.be.true;
    });

    test('returns false when followRedirect is truthy but not true', () => {
      window.Nuxeo.UI.config.url.followRedirect = 'yes';
      expect(element.isFollowRedirectEnabled()).to.be.false;
    });

    test('returns false when followRedirect is unset', () => {
      delete window.Nuxeo.UI.config.url.followRedirect;
      expect(element.isFollowRedirectEnabled()).to.be.false;
    });
  });

  suite('_thumbnail with followRedirect', () => {
    setup(() => {
      window.Nuxeo = window.Nuxeo || {};
      window.Nuxeo.UI = window.Nuxeo.UI || {};
      window.Nuxeo.UI.config = window.Nuxeo.UI.config || {};
      window.Nuxeo.UI.config.url = window.Nuxeo.UI.config.url || {};
    });

    test('does not append clientReason when followRedirect enabled', () => {
      window.Nuxeo.UI.config.url.followRedirect = 'true';
      const doc = {
        uid: '1',
        contextParameters: { thumbnail: { url: 'http://example.com/t.jpg' } },
      };
      const url = element._thumbnail(doc);
      expect(url).to.equal('http://example.com/t.jpg');
      expect(url).to.not.include('clientReason');
    });

    test('uses ampersand when thumbnail URL already has query string', () => {
      window.Nuxeo.UI.config.url.followRedirect = 'false';
      const doc = {
        uid: '1',
        contextParameters: { thumbnail: { url: 'http://example.com/t.jpg?x=1' } },
      };
      const url = element._thumbnail(doc);
      expect(url).to.include('&clientReason=view');
    });
  });

  suite('_hasDocument', () => {
    test('returns uid when doc has uid', () => {
      element.doc = { uid: 'a' };
      expect(element._hasDocument()).to.equal('a');
    });

    test('returns falsy when doc has no uid', () => {
      element.doc = { title: 'x' };
      expect(element._hasDocument()).to.not.be.ok;
    });
  });

  suite('_computeTitle', () => {
    test('includes title and i18n select key', () => {
      expect(element._computeTitle({ title: 'Hello ' })).to.equal('Hello command.select');
    });

    test('handles missing doc title', () => {
      expect(element._computeTitle({})).to.equal('undefinedcommand.select');
    });
  });

  suite('handleClick', () => {
    setup(() => {
      element.doc = { uid: 'd1' };
      element.index = 3;
    });

    test('calls _toogleSelect when selectionMode', () => {
      element.selectionMode = true;
      sinon.spy(element, '_toogleSelect');
      element.handleClick({ detail: { sourceEvent: {} } });
      expect(element._toogleSelect).to.have.been.calledOnce;
      element._toogleSelect.restore();
    });

    test('fires navigate when not in selection mode and no modifier keys', () => {
      element.selectionMode = false;
      sinon.spy(element, 'fire');
      element.handleClick({ ctrlKey: false, shiftKey: false, metaKey: false, button: 0 });
      expect(element.fire).to.have.been.calledWith('navigate', { item: element.doc, index: 3 });
      element.fire.restore();
    });

    test('does not navigate when ctrlKey', () => {
      element.selectionMode = false;
      sinon.spy(element, 'fire');
      element.handleClick({ ctrlKey: true, shiftKey: false, metaKey: false, button: 0 });
      expect(element.fire).to.not.have.been.calledWith('navigate', sinon.match.any);
      element.fire.restore();
    });

    test('does not navigate on middle mouse button', () => {
      element.selectionMode = false;
      sinon.spy(element, 'fire');
      element.handleClick({ ctrlKey: false, shiftKey: false, metaKey: false, button: 1 });
      expect(element.fire).to.not.have.been.calledWith('navigate', sinon.match.any);
      element.fire.restore();
    });
  });

  suite('_handleKeydown', () => {
    test('Enter prevents default and calls handleClick', () => {
      sinon.spy(element, 'handleClick');
      const ev = { key: 'Enter', preventDefault: sinon.stub(), stopPropagation: sinon.stub() };
      element._handleKeydown(ev);
      expect(ev.preventDefault).to.have.been.called;
      expect(ev.stopPropagation).to.have.been.called;
      expect(element.handleClick).to.have.been.calledWith(ev);
      element.handleClick.restore();
    });

    test('Space prevents default and calls handleClick', () => {
      sinon.spy(element, 'handleClick');
      const ev = { key: ' ', preventDefault: sinon.stub(), stopPropagation: sinon.stub() };
      element._handleKeydown(ev);
      expect(element.handleClick).to.have.been.called;
      element.handleClick.restore();
    });
  });

  suite('_onCheckBoxTap', () => {
    test('tap calls _toogleSelect', () => {
      sinon.spy(element, '_toogleSelect');
      element._onCheckBoxTap({ type: 'tap', detail: { sourceEvent: {} } });
      expect(element._toogleSelect).to.have.been.called;
      element._toogleSelect.restore();
    });

    test('keydown with Tab does not toggle', () => {
      sinon.spy(element, '_toogleSelect');
      element._onCheckBoxTap({ type: 'keydown', key: 'Tab' });
      expect(element._toogleSelect).to.not.have.been.called;
      element._toogleSelect.restore();
    });

    test('keydown non-Tab calls _toogleSelect', () => {
      sinon.spy(element, '_toogleSelect');
      element._onCheckBoxTap({ type: 'keydown', key: 'a', detail: { sourceEvent: {} } });
      expect(element._toogleSelect).to.have.been.called;
      element._toogleSelect.restore();
    });
  });

  suite('_toogleSelect', () => {
    test('toggles selected and fires selected with shift from tap', () => {
      element.selected = false;
      element.index = 5;
      sinon.spy(element, 'fire');
      const ev = {
        type: 'tap',
        detail: { sourceEvent: { shiftKey: true } },
      };
      element._toogleSelect(ev);
      expect(element.selected).to.be.true;
      expect(element.fire).to.have.been.calledWith('selected', { index: 5, shiftKey: true });
      element.fire.restore();
    });

    test('keydown uses shiftKey false in payload', () => {
      element.selected = true;
      element.index = 0;
      sinon.spy(element, 'fire');
      element._toogleSelect({ type: 'keydown', detail: { sourceEvent: { shiftKey: true } } });
      expect(element.fire).to.have.been.calledWith('selected', { index: 0, shiftKey: false });
      element.fire.restore();
    });
  });
});
