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

/**
 * Entry-point side effect for `normalizeEntryUrl` (WEBUI-2316).
 *
 * The normalization has to happen before anything else in the bundle issues a request, so that the
 * spent `token` is not in that request's `Referer`. `index.js` cannot do this from its own body:
 * ES module bodies run before the importing module's statements, so a module that fetches at import
 * time — `./i18n/i18n.js` does, to start loading the locale early (WEBUI-1570) — would already have
 * sent its request. Keeping the call in a module of its own lets `index.js` order it ahead of those
 * imports, and keeps `entry-url.js` itself side-effect free for its unit tests.
 */
import { normalizeCurrentEntryUrl } from './entry-url.js';

normalizeCurrentEntryUrl();
