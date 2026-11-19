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
import {
  handleVerticalKeyNavigation,
  blurSelectionCheckOnPointerDeselect,
  calendarDayInTimezone,
} from '../elements/common-utils.js';

suite('common-utils', () => {
  suite('handleVerticalKeyNavigation', () => {
    let rootNode;
    let items;

    function createEvent(key, currentTarget) {
      return {
        key,
        preventDefault: sinon.spy(),
        stopPropagation: sinon.spy(),
        target: { getRootNode: () => rootNode },
        currentTarget: currentTarget || items[0],
      };
    }

    setup(() => {
      items = [
        { focus: sinon.spy(), scrollIntoView: sinon.spy() },
        { focus: sinon.spy(), scrollIntoView: sinon.spy() },
        { focus: sinon.spy(), scrollIntoView: sinon.spy() },
      ];
      rootNode = {
        querySelectorAll: sinon.stub(),
      };
      rootNode.querySelectorAll.withArgs('.item').returns(items);
      rootNode.querySelectorAll.withArgs('nuxeo-data-list').returns([]);
    });

    test('should ignore keys other than ArrowDown and ArrowUp', () => {
      const e = createEvent('Enter');
      handleVerticalKeyNavigation(e, '.item');
      expect(e.preventDefault).to.not.have.been.called;
    });

    test('should focus next item on ArrowDown', () => {
      const e = createEvent('ArrowDown', items[0]);
      handleVerticalKeyNavigation(e, '.item');
      expect(e.preventDefault).to.have.been.called;
      expect(items[1].focus).to.have.been.called;
    });

    test('should focus previous item on ArrowUp', () => {
      const e = createEvent('ArrowUp', items[1]);
      handleVerticalKeyNavigation(e, '.item');
      expect(e.preventDefault).to.have.been.called;
      expect(items[0].focus).to.have.been.called;
    });

    test('should not navigate above the first item on ArrowUp', () => {
      const e = createEvent('ArrowUp', items[0]);
      handleVerticalKeyNavigation(e, '.item');
      expect(e.preventDefault).to.have.been.called;
      // nextIndex would be -1, so no item should be focused
      expect(items[0].focus).to.not.have.been.called;
      expect(items[1].focus).to.not.have.been.called;
      expect(items[2].focus).to.not.have.been.called;
    });

    test('should attempt scroll when ArrowDown goes beyond rendered items', () => {
      const scrollToIndex = sinon.spy();
      rootNode.querySelectorAll.withArgs('nuxeo-data-list').returns([{ scrollToIndex }]);
      const e = createEvent('ArrowDown', items[2]);
      handleVerticalKeyNavigation(e, '.item');
      expect(scrollToIndex).to.have.been.calledWith(3);
    });
  });

  // WEBUI-2056 / WEBUI-2175: after a pointer (mouse/touch) deselect the focused check button
  // must be blurred so `:host(:focus)` / `:host(:focus-within)` stops keeping the tick on
  // screen. Keyboard toggles keep focus so keyboard navigation stays usable.
  suite('blurSelectionCheckOnPointerDeselect', () => {
    let control;
    let host;

    function makeHost(selected) {
      return { selected, shadowRoot: { activeElement: control } };
    }

    setup(() => {
      control = { blur: sinon.spy() };
    });

    test('blurs the focused control on a pointer/mouse deselect', () => {
      host = makeHost(false);
      blurSelectionCheckOnPointerDeselect(host, { type: 'tap', detail: { sourceEvent: new MouseEvent('click') } });
      expect(control.blur).to.have.been.calledOnce;
    });

    test('does not blur on a raw KeyboardEvent deselect', () => {
      host = makeHost(false);
      blurSelectionCheckOnPointerDeselect(host, new KeyboardEvent('keydown', { key: ' ' }));
      expect(control.blur).to.not.have.been.called;
    });

    test('does not blur on a synthesized tap whose sourceEvent is a KeyboardEvent', () => {
      host = makeHost(false);
      blurSelectionCheckOnPointerDeselect(host, {
        type: 'tap',
        detail: { sourceEvent: new KeyboardEvent('keydown', { key: ' ' }) },
      });
      expect(control.blur).to.not.have.been.called;
    });

    test('does not blur when host.selected is true (a selection, not a deselect)', () => {
      host = makeHost(true);
      blurSelectionCheckOnPointerDeselect(host, { type: 'tap', detail: { sourceEvent: new MouseEvent('click') } });
      expect(control.blur).to.not.have.been.called;
    });

    test('is a no-op when there is no focused element', () => {
      host = { selected: false, shadowRoot: { activeElement: null } };
      expect(() => blurSelectionCheckOnPointerDeselect(host, new MouseEvent('click'))).to.not.throw();
    });

    test('is a no-op when there is no host', () => {
      expect(() => blurSelectionCheckOnPointerDeselect(null, new MouseEvent('click'))).to.not.throw();
    });
  });

  suite('calendarDayInTimezone', () => {
    // 2026-01-20T03:00Z is still January 19 west of UTC-03:00 and already January 20 east of it.
    const instant = '2026-01-20T03:00:00.000Z';

    test('returns the calendar day of an instant in the given timezone', () => {
      expect(calendarDayInTimezone(instant, 'America/New_York')).to.equal('2026-01-19');
      expect(calendarDayInTimezone(instant, 'Etc/UTC')).to.equal('2026-01-20');
      expect(calendarDayInTimezone(instant, 'Asia/Tokyo')).to.equal('2026-01-20');
      expect(calendarDayInTimezone('2026-01-19T15:00:00.000Z', 'Asia/Tokyo')).to.equal('2026-01-20');
      expect(calendarDayInTimezone('2026-01-20T10:30:00.000Z', 'Pacific/Kiritimati')).to.equal('2026-01-21');
    });

    test('keeps date-only strings unchanged', () => {
      expect(calendarDayInTimezone('2026-01-20', 'Pacific/Pago_Pago')).to.equal('2026-01-20');
    });

    test('accepts Date objects, timestamps and padded zone ids', () => {
      const date = new Date(instant);
      expect(calendarDayInTimezone(date, ' America/New_York ')).to.equal('2026-01-19');
      expect(calendarDayInTimezone(date.getTime(), 'Asia/Tokyo')).to.equal('2026-01-20');
    });

    test('uses the browser day without a timezone or with an unknown one', () => {
      const local = new Date(instant);
      const expected = [
        String(local.getFullYear()),
        String(local.getMonth() + 1).padStart(2, '0'),
        String(local.getDate()).padStart(2, '0'),
      ].join('-');
      expect(calendarDayInTimezone(instant)).to.equal(expected);
      expect(calendarDayInTimezone(instant, '')).to.equal(expected);
      expect(calendarDayInTimezone(instant, 'Mars/Phobos')).to.equal(expected);
    });

    test('returns an empty day for missing or invalid dates', () => {
      expect(calendarDayInTimezone(null, 'Asia/Tokyo')).to.equal('');
      expect(calendarDayInTimezone('not a date', 'Asia/Tokyo')).to.equal('');
    });
  });
});
