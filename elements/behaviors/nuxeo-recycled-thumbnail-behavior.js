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
import { applyThumbnailFallback } from '../common-utils.js';

/**
 * Thumbnail handling for result items rendered inside a recycled virtual list.
 *
 * `iron-list` reuses a small pool of rows, so a host is rebound to a different document as the
 * user scrolls. Polymer updates the text bindings synchronously, but an `<img>` keeps painting its
 * previous frame until the new `src` has been fetched and decoded — leaving the row showing one
 * document's picture beside another document's title (WEBUI-340). Chromium, WebKit and Firefox all
 * behave this way; it is ordinary `<img>` semantics, not a browser bug.
 *
 * This behavior gives the host what `iron-image` provides: `_thumbnailLoaded` drops as soon as the
 * source changes and only comes back on that source's own `load` event, so the host can keep the
 * image hidden — falling back to its neutral thumbnail box — instead of showing a stale picture.
 *
 * The host is expected to:
 *   - declare a `doc` property,
 *   - bind `src="[[_thumbnailSrc]]"`, `loaded$="[[_thumbnailLoaded]]"`, `on-load="_onLoad"` and
 *     `on-error="_onError"` on its thumbnail `<img>`,
 *   - style that image as hidden unless `[loaded]` is present.
 *
 * @polymerBehavior Nuxeo.RecycledThumbnailBehavior
 */
export const NuxeoRecycledThumbnailBehavior = {
  properties: {
    /** Decorated thumbnail URL for the bound document, or '' when it has none. */
    _thumbnailSrc: {
      type: String,
      computed: '_thumbnail(doc)',
      observer: '_thumbnailSrcChanged',
    },

    /** True only while the image on screen is the one `_thumbnailSrc` asked for. */
    _thumbnailLoaded: {
      type: Boolean,
      value: false,
    },
  },

  _thumbnail(doc) {
    if (
      doc &&
      doc.uid &&
      doc.contextParameters &&
      doc.contextParameters.thumbnail &&
      doc.contextParameters.thumbnail.url
    ) {
      const { url } = doc.contextParameters.thumbnail;
      // Derive the decorated URL instead of writing it back onto the document. A recycled host
      // meets the same document again whenever the user scrolls back over it, and mutating the
      // shared entry appended clientReason=view once per visit.
      if (this.isFollowRedirectEnabled() || url.includes('clientReason=')) {
        return url;
      }
      return `${url}${url.includes('?') ? '&' : '?'}clientReason=view`;
    }
    return '';
  },

  isFollowRedirectEnabled() {
    const followRedirect = Nuxeo?.UI?.config?.url?.followRedirect;
    return followRedirect ? String(followRedirect).toLowerCase() === 'true' : false;
  },

  _thumbnailSrcChanged() {
    this._thumbnailLoaded = false;
  },

  _onLoad(e) {
    // A load event can still be delivered for a request that has since been superseded, because
    // the host was rebound to another document while that image was in flight. Honouring it would
    // put the previous document's picture back on screen, so only trust a load whose completed
    // candidate (currentSrc) is the one currently requested.
    const img = e.target;
    if (img.currentSrc && img.src && img.currentSrc !== img.src) {
      return;
    }
    this._thumbnailLoaded = true;
  },

  // ELEMENTS-1616: show a transparent pixel instead of a broken-image icon when a
  // (cross-origin) thumbnail fails to load.
  _onError(e) {
    applyThumbnailFallback(e.target);
  },
};
