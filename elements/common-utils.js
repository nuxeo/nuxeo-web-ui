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

export function handleVerticalKeyNavigation(e, itemSelector) {
  const { key } = e;
  if (key !== 'ArrowDown' && key !== 'ArrowUp') return;

  e.preventDefault();
  e.stopPropagation();

  const rootNode = e.target.getRootNode();
  const items = rootNode.querySelectorAll(itemSelector);
  const currentIndex = Array.from(items).indexOf(e.currentTarget);
  const nextIndex = key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;

  if (nextIndex < 0) return;

  // Case 1: nextIndex is still inside currently rendered items
  if (nextIndex < items.length) {
    items[nextIndex].focus();
    return;
  }

  // Case 2: need to ask iron-list for more
  const scrollItem = rootNode.querySelectorAll('nuxeo-data-list');
  if (scrollItem && typeof scrollItem[0].scrollToIndex === 'function') {
    scrollItem[0].scrollToIndex(nextIndex);

    // Wait for iron-list to render the new item
    requestAnimationFrame(() => {
      const updatedItems = rootNode.querySelectorAll(itemSelector);
      const nextItem = updatedItems[0];
      if (nextItem) {
        nextItem.focus();
        nextItem.scrollIntoView({ block: 'nearest' });
      }
    });
  }
}

// ELEMENTS-1616: shared transparent 1x1 pixel used as the thumbnail fallback when a
// (cross-origin) image request fails to load, so views degrade gracefully instead of
// showing a broken-image icon. Kept in one place so the grid and list thumbnails stay
// consistent with nuxeo-document-thumbnail.
export const BLANK_THUMBNAIL_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAA' +
  'C0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Swaps a failed thumbnail <img> for the transparent pixel above.
export function applyThumbnailFallback(img) {
  img.src = BLANK_THUMBNAIL_SRC;
}

// WEBUI-2056 / WEBUI-2175: the list/grid selection tick is a `paper-icon-button` whose
// visibility is held on screen by `:host(:focus)` / `:host(:focus-within)`. A mouse click
// to deselect leaves that button focused, so the tick lingers until the user clicks
// elsewhere. After a *pointer* (mouse/touch) deselect, blur the focused control so those
// focus rules stop matching and the tick disappears immediately. *Keyboard* toggles keep
// focus so keyboard navigation/selection stays usable — the results view synthesizes a
// `tap` whose `detail.sourceEvent` is the original KeyboardEvent, and grid keydown events
// are real KeyboardEvents; both are detected here and left untouched. Shared so the list
// and grid items stay in sync.
export function blurSelectionCheckOnPointerDeselect(host, e) {
  if (!host || host.selected) {
    return;
  }
  const isKeyboardEvent = (evt) =>
    !!evt &&
    ((typeof KeyboardEvent !== 'undefined' && evt instanceof KeyboardEvent) ||
      String(evt.type || '').startsWith('key'));
  if (isKeyboardEvent(e) || isKeyboardEvent(e?.detail?.sourceEvent)) {
    return;
  }
  const focused = host.shadowRoot?.activeElement;
  if (focused && typeof focused.blur === 'function') {
    focused.blur();
  }
}
