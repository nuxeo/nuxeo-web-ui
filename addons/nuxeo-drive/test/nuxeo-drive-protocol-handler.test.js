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

  /** Convenience: start a Drive URL open with test-sized timeouts. */
  function openDrive() {
    openDriveUrl('nxdrive://test', toggle, TIMEOUT, DEBOUNCE);
  }

  /** Convenience: fire blur and let the debounce settle. */
  function fireBlurDebounce() {
    fireWindowEvent('blur');
    clock.tick(DEBOUNCE);
  }

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
      openDrive();
      expect(toggle).not.to.have.been.called;

      clock.tick(TIMEOUT);

      expect(toggle).to.have.been.calledOnce;
    });

    test('does not show dialog again if already shown', () => {
      openDrive();
      clock.tick(TIMEOUT);
      expect(toggle).to.have.been.calledOnce;

      // Tick more — should not toggle again.
      clock.tick(TIMEOUT * 5);
      expect(toggle).to.have.been.calledOnce;
    });
  });

  suite('blur + quick focus return (Chrome/Edge/Safari — Drive absent)', () => {
    test('shows install dialog when focus returns quickly after debounce settles', () => {
      openDrive();

      fireBlurDebounce(); // debounce settles — debounceSettledAt recorded
      fireWindowEvent('focus'); // quick return (0ms elapsed since debounce settled, < TIMEOUT)

      expect(toggle).to.have.been.calledOnce;
    });

    test('does not show dialog when focus returns slowly (Drive is installed)', () => {
      // Blur fires → debounce settles (appOpened=true) → primary timer finds appOpened=true, no show().
      // Slow focus return → onFocusAfterOpened → elapsed >= TIMEOUT → hide() but dialogShown=false → no-op.
      openDrive();

      fireBlurDebounce(); // debounce settles, appOpened=true, onFocusAfterOpened registered
      clock.tick(TIMEOUT); // primary fires but appOpened=true → no show(); elapsed from debounce >= TIMEOUT
      fireWindowEvent('focus'); // slow return → hide() is a no-op since dialogShown=false

      expect(toggle).not.to.have.been.called;
    });
  });

  suite('blur + quick focus during debounce (Drive opened as background app)', () => {
    test('does not show dialog when focus fires before debounce settles', () => {
      openDrive();

      fireWindowEvent('blur');
      clock.tick(DEBOUNCE / 2); // still within debounce window
      fireWindowEvent('focus'); // Drive returned focus before debounce settled

      clock.tick(TIMEOUT * 2); // let everything expire
      expect(toggle).not.to.have.been.called;
    });
  });

  suite('primary timeout fires before blur / show() is idempotent', () => {
    test('blur after primary timeout dismisses dialog and show() does not double-toggle', () => {
      openDrive();
      clock.tick(TIMEOUT);
      expect(toggle).to.have.been.calledOnce; // dialog shown (show() called)

      // Blur arrives — confirms Drive/OS dialog was involved → hide().
      // Also verifies show() is idempotent: dialogShown was true, hide() is called once, not show() again.
      fireBlurDebounce();
      expect(toggle).to.have.been.calledTwice; // hide() fired, no extra show()
    });
  });

  suite('Firefox path — no blur fires, primary timeout shows dialog', () => {
    test('shows dialog once; subsequent focus/tick after cleanup have no effect', () => {
      openDrive();
      clock.tick(TIMEOUT);
      expect(toggle).to.have.been.calledOnce;

      // Any subsequent focus after cleanup should have no effect.
      fireWindowEvent('focus');
      clock.tick(TIMEOUT);
      expect(toggle).to.have.been.calledOnce;
    });
  });

  suite('cleanup — no lingering listeners after completion', () => {
    test('hardCap timer removes all listeners even if the user never refocuses', () => {
      openDrive();

      // Hard cap fires at timeoutMs + 3000ms (using proportional ms here).
      clock.tick(TIMEOUT + 3000);

      // Any subsequent blur/focus should have no effect.
      fireBlurDebounce();
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
  teardown(() => sinon.restore());

  test('appends a hidden anchor, sets correct attributes, clicks it, then removes it', () => {
    const spy = sinon.spy(document.body, 'appendChild');
    navigateTo('nxdrive://test/url');
    const anchor = spy.firstCall.args[0];
    expect(spy).to.have.been.calledOnce;
    expect(anchor.tagName).to.equal('A');
    expect(anchor.getAttribute('aria-hidden')).to.equal('true');
    expect(anchor.getAttribute('tabindex')).to.equal('-1');
    // anchor.remove() is used — verify it is no longer in the DOM
    expect(document.body.contains(anchor)).to.be.false;
  });

  test('anchor href contains the protocol scheme and DOM is left clean', () => {
    const before = document.body.children.length;
    const spy = sinon.spy(document.body, 'appendChild');
    navigateTo('nxdrive://direct-download/abc123');
    expect(spy.firstCall.args[0].href).to.include('nxdrive');
    expect(document.body.children.length).to.equal(before);
  });

  test('does not modify window.location', () => {
    const before = globalThis.location.href;
    navigateTo('nxdrive://test/url');
    expect(globalThis.location.href).to.equal(before);
  });
});
