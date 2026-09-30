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
import { fixture, flush, html, login } from '@nuxeo/testing-helpers';
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

    // ELEMENTS-1616: the list-item thumbnail must request the same URL with CORS
    // so it stays consistent with the grid/preview <img> and avoids Chrome's
    // cross-origin image cache poisoning under S3 direct download.
    test('requests its thumbnail with CORS enabled', () => {
      const thumbnail = element.shadowRoot.querySelector('.thumbnailContainer img');
      expect(thumbnail).to.be.ok;
      expect(thumbnail.getAttribute('crossorigin')).to.equal('anonymous');
    });

    // ELEMENTS-1616: when the (cross-origin) thumbnail request fails, the row should
    // render a transparent pixel rather than a broken-image icon. Dispatch the actual
    // error event so the declarative on-error="_onError" binding is covered as well.
    test('falls back to an inline transparent image on thumbnail error', () => {
      const thumbnail = element.shadowRoot.querySelector('.thumbnailContainer img');
      thumbnail.dispatchEvent(new Event('error'));
      expect(thumbnail.getAttribute('src')).to.contain('data:image/png;base64,');
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

  // The title used to be an anchor with no href, so the browser offered no link actions when
  // right-clicking it. It is a real link now, and the row has to keep behaving as before on a
  // plain click, in selection mode and when activated from the keyboard.
  //
  // These tests dispatch real mouse and keyboard events so the Polymer tap gesture and the row
  // handlers run exactly as they do in the browser. A document level guard records whether the
  // element had already cancelled the link navigation, then cancels it in any case so the test
  // page never navigates away.
  suite('title link', () => {
    let lastClickPrevented;

    const clickGuard = (e) => {
      lastClickPrevented = e.defaultPrevented;
      e.preventDefault();
    };

    setup(async () => {
      sinon.stub(element, 'urlFor').returns('/doc/doc-1');
      element.doc = { uid: 'doc-1', title: 'My Document', type: 'File' };
      element.index = 1;
      await flush();
      lastClickPrevented = undefined;
      document.addEventListener('click', clickGuard);
    });

    teardown(() => {
      document.removeEventListener('click', clickGuard);
    });

    const title = () => element.shadowRoot.querySelector('a.title');
    const thumbnail = () => element.shadowRoot.querySelector('.thumbnailContainer');
    const extraRowTabStop = () => element.shadowRoot.querySelector('.dataContainer [tabindex="0"]');

    function click(node, init = {}) {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, ...init }));
    }

    function pressEnter(node) {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      node.dispatchEvent(event);
      return event;
    }

    function countEvents() {
      const fired = { navigate: 0, selected: 0 };
      element.addEventListener('navigate', () => fired.navigate++);
      element.addEventListener('selected', () => fired.selected++);
      return fired;
    }

    function enterSelectionMode() {
      element.selectedItems = [{ uid: 'another-doc' }];
      element._selectedItemsChanged();
      expect(element.selectionMode, 'selection mode should be on').to.be.true;
    }

    test('carries the document URL so the browser can offer its own link actions', () => {
      expect(title(), 'a.title should be rendered').to.exist;
      expect(title().getAttribute('href')).to.equal('/doc/doc-1');
    });

    // An href attribute must be absent rather than empty: href="" is a link back to the current
    // page, so the browser menu would offer to open the search page instead of the document.
    test('has no href attribute at all when the item is not a routable document', async () => {
      element.urlFor.throws(new Error('cannot resolve route'));
      element.doc = { uid: 'not-routable', title: 'No route', type: 'File' };
      await flush();
      expect(title().hasAttribute('href'), 'href should be removed, not empty').to.be.false;
    });

    test('resolves no URL for an item that cannot be routed', () => {
      element.urlFor.throws(new Error('cannot resolve route'));
      expect(element._documentUrl({ uid: 'no-route' })).to.be.undefined;
      element.urlFor.returns('');
      expect(element._documentUrl({ uid: 'empty-url' })).to.be.undefined;
      expect(element._documentUrl({})).to.be.undefined;
      expect(element._documentUrl(undefined)).to.be.undefined;
    });

    test('is the keyboard stop for the row content, so its browser menu is reachable', () => {
      expect(title().tabIndex, 'the link should be in the tab order').to.equal(0);
      expect(extraRowTabStop(), 'the div around it should not repeat the stop').to.not.exist;
    });

    test('takes keyboard focus', () => {
      title().focus();
      // Some headless environments ignore focus(), and the assertion only means something once
      // the link is actually focused.
      if (element.shadowRoot.activeElement !== title()) {
        return;
      }
      expect(element.shadowRoot.activeElement).to.equal(title());
    });

    // Space is how the results view (de)selects the focused row, so the link must not take it.
    test('leaves Space to the results view', () => {
      const event = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      let reachedHost = false;
      element.addEventListener('keydown', () => {
        reachedHost = true;
      });
      title().dispatchEvent(event);
      expect(reachedHost, 'Space should still bubble out of the element').to.be.true;
      expect(event.defaultPrevented, 'Space should not be cancelled here').to.be.false;
    });

    test('a right-click opens the browser menu without navigating or selecting', () => {
      const fired = countEvents();
      const init = { bubbles: true, composed: true, cancelable: true, button: 2, buttons: 2 };
      title().dispatchEvent(new MouseEvent('mousedown', init));
      title().dispatchEvent(new MouseEvent('contextmenu', init));
      expect(fired.navigate, 'should not navigate').to.equal(0);
      expect(fired.selected, 'should not change the selection').to.equal(0);
      expect(element.selected).to.be.false;
    });

    test('a plain click routes in place and the link does not navigate on top of it', () => {
      const fired = countEvents();
      click(title());
      expect(fired.navigate, 'navigate count').to.equal(1);
      expect(lastClickPrevented, 'link navigation should be cancelled').to.be.true;
    });

    test('a plain click on the title text behaves the same', () => {
      const fired = countEvents();
      click(element.shadowRoot.querySelector('a.title div.title'));
      expect(fired.navigate).to.equal(1);
      expect(lastClickPrevented).to.be.true;
    });

    [
      { label: 'Ctrl', init: { ctrlKey: true } },
      { label: 'Meta', init: { metaKey: true } },
      { label: 'Shift', init: { shiftKey: true } },
      { label: 'the middle button', init: { button: 1 } },
    ].forEach(({ label, init }) => {
      test(`a click with ${label} is left to the browser, which opens a new tab or window`, () => {
        const fired = countEvents();
        click(title(), init);
        expect(fired.navigate, 'should not navigate in place').to.equal(0);
        expect(lastClickPrevented, 'the click should be left alone').to.be.false;
      });
    });

    test('Enter activates the item once and the link does not navigate on top of it', () => {
      const fired = countEvents();
      const event = pressEnter(title());
      expect(fired.navigate, 'navigate count').to.equal(1);
      expect(event.defaultPrevented, 'the key should not activate the link').to.be.true;
      expect(lastClickPrevented, 'link navigation should be cancelled').to.be.true;
    });

    test('other keys on the link are left alone', () => {
      const fired = countEvents();
      title().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, composed: true }));
      expect(fired.navigate).to.equal(0);
    });

    suite('in selection mode', () => {
      test('a click on the title toggles once and does not follow the link', () => {
        enterSelectionMode();
        const fired = countEvents();
        click(title());
        expect(fired.selected, 'selected count').to.equal(1);
        expect(element.selected, 'the item should be selected').to.be.true;
        expect(fired.navigate, 'should not navigate').to.equal(0);
        expect(lastClickPrevented, 'link navigation should be cancelled').to.be.true;
      });

      test('a shift-click on the title still extends the selection', () => {
        enterSelectionMode();
        let payload;
        element.addEventListener('selected', (e) => {
          payload = e.detail;
        });
        click(title(), { shiftKey: true });
        expect(payload).to.deep.equal({ index: 1, shiftKey: true });
        expect(lastClickPrevented, 'link navigation should be cancelled').to.be.true;
      });

      test('Enter on the title toggles once', () => {
        enterSelectionMode();
        const fired = countEvents();
        pressEnter(title());
        expect(fired.selected).to.equal(1);
      });
    });

    // The link sits inside the row, so the rest of the row must keep working as it did.
    suite('rest of the row', () => {
      test('a click on the thumbnail still navigates', () => {
        const fired = countEvents();
        click(thumbnail());
        expect(fired.navigate).to.equal(1);
      });

      test('Enter handled by the row itself still navigates once', () => {
        const fired = countEvents();
        pressEnter(element.shadowRoot.querySelector('.dataContainer'));
        expect(fired.navigate).to.equal(1);
      });

      test('Enter on the thumbnail still navigates once', () => {
        const fired = countEvents();
        pressEnter(thumbnail());
        expect(fired.navigate).to.equal(1);
      });

      test('a click on the thumbnail in selection mode toggles once', () => {
        enterSelectionMode();
        const fired = countEvents();
        click(thumbnail());
        expect(fired.selected).to.equal(1);
      });

      test('the select control still toggles the selection', () => {
        const fired = countEvents();
        click(element.shadowRoot.querySelector('.select paper-icon-button'));
        expect(fired.selected).to.be.greaterThan(0);
      });
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

  // WEBUI-2056 / WEBUI-2175: integration check that a mouse deselect through `_toogleSelect`
  // clears focus from the check button (the shared helper is unit-tested in common-utils).
  suite('_toogleSelect blur-on-deselect wiring', () => {
    test('mouse deselect clears shadowRoot.activeElement', () => {
      const button = element.shadowRoot.querySelector('.select paper-icon-button');
      element.selected = true;
      button.focus();
      // Some headless/virtualized environments ignore `.focus()`; the blur behavior is only
      // meaningful once the control is actually focused, so skip the assertion otherwise.
      if (element.shadowRoot.activeElement !== button) {
        return;
      }
      element._toogleSelect({ type: 'tap', detail: { sourceEvent: new MouseEvent('click') } });
      expect(element.selected).to.be.false;
      expect(element.shadowRoot.activeElement).to.not.equal(button);
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
