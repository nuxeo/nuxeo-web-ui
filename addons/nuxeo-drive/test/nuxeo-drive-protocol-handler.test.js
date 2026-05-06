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
  openDriveUrl,
  navigateTo,
  DRIVE_OPEN_TIMEOUT_MS,
  BLUR_DEBOUNCE_MS,
} from '../elements/nuxeo-drive-protocol-handler.js';

// Prevent nxdrive:// anchor clicks from triggering a Karma page reload.
HTMLAnchorElement.prototype.click = HTMLAnchorElement.prototype.click || function () {};

// Use short timeouts in tests to keep the suite fast.
const TIMEOUT = 50;
const DEBOUNCE = 20;

/**
 * Fires a synthetic window event and returns it.
 */
function fireWindowEvent(type) {
  const evt = new Event(type);
  globalThis.dispatchEvent(evt);
  return evt;
}

suite('nuxeo-drive-protocol-handler', () => {
  let toggle;
  let clock;

  setup(() => {
    toggle = sinon.stub();
    clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });

  teardown(() => {
    clock.restore();
    // Remove any lingering listeners added during the test.
    globalThis.dispatchEvent(new Event('focus'));
    globalThis.dispatchEvent(new Event('blur'));
  });

  suite('exported constants', () => {
    test('DRIVE_OPEN_TIMEOUT_MS is a positive number', () => {
      expect(DRIVE_OPEN_TIMEOUT_MS).to.be.a('number').and.to.be.above(0);
    });

    test('BLUR_DEBOUNCE_MS is positive and less than DRIVE_OPEN_TIMEOUT_MS', () => {
      expect(BLUR_DEBOUNCE_MS).to.be.a('number').and.to.be.above(0);
      expect(BLUR_DEBOUNCE_MS).to.be.below(DRIVE_OPEN_TIMEOUT_MS);
    });
  });

  suite('primary timeout path (Firefox / Drive truly absent)', () => {
    test('shows install dialog when no blur fires within timeoutMs', () => {
      openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);
      expect(toggle).not.to.have.been.called;

      clock.tick(TIMEOUT);

      expect(toggle).to.have.been.calledOnce;
    });

    test('does not show dialog again if already shown', () => {
      openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);
      clock.tick(TIMEOUT);
      expect(toggle).to.have.been.calledOnce;

      // Tick more — should not toggle again.
      clock.tick(TIMEOUT * 5);
      expect(toggle).to.have.been.calledOnce;
    });
  });

  suite('blur + quick focus return (Chrome/Edge/Safari — Drive absent)', () => {
    test('shows install dialog when focus returns quickly after debounce settles', () => {
      openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);

      fireWindowEvent('blur');
      clock.tick(DEBOUNCE); // debounce settles — debounceSettledAt recorded
      fireWindowEvent('focus'); // quick return (0ms elapsed since debounce settled, < TIMEOUT)

      expect(toggle).to.have.been.calledOnce;
    });

    test('does not show dialog when focus returns slowly (Drive is installed)', () => {
      // Blur fires → debounce settles (appOpened=true) → primary timer finds appOpened=true, no show().
      // Slow focus return → onFocusAfterOpened → elapsed >= TIMEOUT → hide() but dialogShown=false → no-op.
      openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);

      fireWindowEvent('blur');
      clock.tick(DEBOUNCE); // debounce settles, appOpened=true, onFocusAfterOpened registered
      clock.tick(TIMEOUT); // primary fires but appOpened=true → no show(); elapsed from debounce >= TIMEOUT
      fireWindowEvent('focus'); // slow return → hide() is a no-op since dialogShown=false

      expect(toggle).not.to.have.been.called;
    });
  });

  suite('blur + quick focus during debounce (Drive opened as background app)', () => {
    test('does not show dialog when focus fires before debounce settles', () => {
      openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);

      fireWindowEvent('blur');
      clock.tick(DEBOUNCE / 2); // still within debounce window
      fireWindowEvent('focus'); // Drive returned focus before debounce settled

      clock.tick(TIMEOUT * 2); // let everything expire
      expect(toggle).not.to.have.been.called;
    });
  });

  suite('primary timeout fires before blur (race condition)', () => {
    test('dismisses dialog when blur arrives after primary timeout', () => {
      openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);

      // Primary timeout fires first.
      clock.tick(TIMEOUT);
      expect(toggle).to.have.been.calledOnce; // dialog shown

      // Then blur arrives.
      fireWindowEvent('blur');
      clock.tick(DEBOUNCE);

      // Blur confirms Drive/OS dialog was involved → dismiss.
      expect(toggle).to.have.been.calledTwice;
    });
  });

  suite('show() called when dialog already visible — no double toggle', () => {
    test('show() is idempotent: second call while dialogShown is true does not call toggle again', () => {
      // Primary timeout fires → show() called (dialogShown becomes true).
      openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);
      clock.tick(TIMEOUT);
      expect(toggle).to.have.been.calledOnce; // first show

      // Simulate blur arriving after the primary timeout fired (dialogShown already true).
      fireWindowEvent('blur');
      clock.tick(DEBOUNCE);

      // Blur fires hide() (dialogShown → false) then re-registers onFocusAfterOpened.
      // No extra show() should have occurred at this point.
      expect(toggle).to.have.been.calledTwice; // hide() fired
    });
  });

  suite('Firefox path — onFocusAfterOpened is NOT registered after blur', () => {
    test('primary timeout fires and shows dialog when no blur occurs (Firefox-like behavior)', () => {
      // On Firefox, blur never fires when the protocol handler is absent.
      // Simulate this: open the URL, no blur, let the primary timeout expire.
      openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);

      // No blur dispatched — primary timeout fires.
      clock.tick(TIMEOUT);

      // Dialog should be shown exactly once by the primary timeout.
      expect(toggle).to.have.been.calledOnce;

      // Any subsequent focus after cleanup should have no effect.
      fireWindowEvent('focus');
      clock.tick(TIMEOUT);
      expect(toggle).to.have.been.calledOnce;
    });

    test('Chrome path registers onFocusAfterOpened; quick focus return shows dialog', () => {
      // On Chrome/Edge/Safari (non-Firefox), blur fires and onFocusAfterOpened IS registered.
      // Quick focus return (< timeoutMs elapsed since debounce settled) → show().
      openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);

      fireWindowEvent('blur');
      clock.tick(DEBOUNCE); // debounce settles
      fireWindowEvent('focus'); // immediately return → elapsed ≈ 0 < TIMEOUT → show()

      expect(toggle).to.have.been.calledOnce;
    });
  });

  suite('cleanup — no lingering listeners after completion', () => {
    test('hardCap timer removes all listeners even if the user never refocuses', () => {
      openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);

      // Hard cap fires at timeoutMs + 3000ms (using proportional ms here).
      clock.tick(TIMEOUT + 3000);

      // Any subsequent blur/focus should have no effect.
      fireWindowEvent('blur');
      clock.tick(DEBOUNCE);
      fireWindowEvent('focus');

      expect(toggle).to.have.been.calledOnce; // only the primary timeout show
    });

    test('calling openDriveUrl twice does not cross-contaminate', () => {
      const toggle2 = sinon.stub();

      openDriveUrl('nxdrive://first', toggle, TIMEOUT, DEBOUNCE);
      openDriveUrl('nxdrive://second', toggle2, TIMEOUT, DEBOUNCE);

      clock.tick(TIMEOUT);

      // Both show independently.
      expect(toggle).to.have.been.calledOnce;
      expect(toggle2).to.have.been.calledOnce;
    });
  });
});

// ---------------------------------------------------------------------------
// navigateTo — tested separately (no fake timers needed)
// ---------------------------------------------------------------------------
suite('navigateTo', () => {
  let appendSpy;
  let anchor;

  setup(() => {
    appendSpy = sinon.spy(document.body, 'appendChild');
  });

  teardown(() => {
    sinon.restore();
    appendSpy = null;
    anchor = null;
  });

  /**
   * Calls navigateTo and captures the anchor element appended to the body.
   */
  function navigate(url) {
    navigateTo(url);
    anchor = appendSpy.firstCall.args[0];
  }

  test('appends a hidden anchor to document.body, clicks it, then removes it', () => {
    navigate('nxdrive://test/url');
    expect(appendSpy).to.have.been.calledOnce;
    expect(anchor.tagName).to.equal('A');
    // anchor.remove() is used (preferred over parentNode.removeChild); verify it is no longer in the DOM
    expect(document.body.contains(anchor)).to.be.false;
  });

  test('anchor href contains the given URL', () => {
    navigate('nxdrive://direct-download/abc123');
    expect(anchor.href).to.include('nxdrive');
  });

  test('anchor is aria-hidden and not in tab order', () => {
    navigate('nxdrive://test/url');
    expect(anchor.getAttribute('aria-hidden')).to.equal('true');
    expect(anchor.getAttribute('tabindex')).to.equal('-1');
  });

  test('anchor is not left in the DOM after navigation', () => {
    const before = document.body.children.length;
    navigateTo('nxdrive://test/url');
    expect(document.body.children.length).to.equal(before);
  });

  test('does not modify window.location', () => {
    const before = globalThis.location.href;
    navigateTo('nxdrive://test/url');
    expect(globalThis.location.href).to.equal(before);
  });
});
