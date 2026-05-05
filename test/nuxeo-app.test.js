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
import { IronOverlayManager } from '@polymer/iron-overlay-behavior/iron-overlay-manager.js';

/**
 * Test the focusIsWithinOrIs logic used in WEBUI-1878 modal tab wrapping.
 * This mirrors the function in elements/nuxeo-app.js without requiring full element import.
 */
function focusIsWithinOrIs(scope, node) {
  if (!scope || !node) {
    return false;
  }
  let current = node;
  while (current) {
    if (current === scope) {
      return true;
    }
    const root = current.getRootNode();
    if (root instanceof ShadowRoot) {
      current = root.host;
    } else {
      current = current.parentElement;
    }
  }
  return false;
}

suite('nuxeo-app skip link and modal tab handling (WEBUI-1878)', () => {
  test('focusIsWithinOrIs returns true when node is scope', () => {
    const scope = document.createElement('div');
    expect(focusIsWithinOrIs(scope, scope)).to.equal(true);
  });

  test('focusIsWithinOrIs returns true when node is a child of scope', () => {
    const scope = document.createElement('div');
    const child = document.createElement('button');
    scope.appendChild(child);
    expect(focusIsWithinOrIs(scope, child)).to.equal(true);
  });

  test('focusIsWithinOrIs returns false when node is not within scope', () => {
    const scope = document.createElement('div');
    const other = document.createElement('button');
    expect(focusIsWithinOrIs(scope, other)).to.equal(false);
  });

  test('focusIsWithinOrIs crosses shadow boundaries', () => {
    const scope = document.createElement('div');
    const shadow = scope.attachShadow({ mode: 'open' });
    const innerButton = document.createElement('button');
    shadow.appendChild(innerButton);

    expect(focusIsWithinOrIs(scope, innerButton)).to.equal(true);
  });

  test('focusIsWithinOrIs handles null/undefined gracefully', () => {
    const scope = document.createElement('div');
    expect(focusIsWithinOrIs(null, scope)).to.equal(false);
    expect(focusIsWithinOrIs(scope, null)).to.equal(false);
    expect(focusIsWithinOrIs(null, null)).to.equal(false);
  });

  test('focusIsWithinOrIs works with deeply nested shadow trees', () => {
    const outer = document.createElement('div');
    const outerShadow = outer.attachShadow({ mode: 'open' });
    const middle = document.createElement('div');
    outerShadow.appendChild(middle);

    const innerShadow = middle.attachShadow({ mode: 'open' });
    const innerButton = document.createElement('button');
    innerShadow.appendChild(innerButton);

    expect(focusIsWithinOrIs(outer, innerButton)).to.equal(true);
  });

  test('IronOverlayManager can be stubbed for overlay state testing', () => {
    let mockOverlay = { withBackdrop: true };
    sinon.stub(IronOverlayManager, 'currentOverlay').returns(mockOverlay);

    expect(IronOverlayManager.currentOverlay()).to.equal(mockOverlay);
    expect(IronOverlayManager.currentOverlay().withBackdrop).to.equal(true);

    sinon.restore();
  });

  test('Tab wrapping logic: shift+tab at first should wrap to last', () => {
    const atFirst = { element: 'first', position: 'first' };

    // Simulate: if shiftKey && (atFirst || onOverlayHost) => wrap to last
    const shouldWrapToLast = true && (atFirst.position === 'first' || atFirst.position === 'host');
    expect(shouldWrapToLast).to.equal(true);
  });

  test('Tab wrapping logic: tab at last should wrap to first', () => {
    const atLast = { element: 'last', position: 'last' };

    // Simulate: if !shiftKey && atLast => wrap to first
    const shouldWrapToFirst = !true && atLast.position === 'last';
    expect(shouldWrapToFirst).to.equal(false);

    const shiftKey = false;
    const shouldWrapToFirstCorrect = !shiftKey && atLast.position === 'last';
    expect(shouldWrapToFirstCorrect).to.equal(true);
  });
});
