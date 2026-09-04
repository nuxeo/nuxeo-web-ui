/**
@license
©2026 Hyland Software, Inc. and its affiliates. All rights reserved.
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

import { isBrandingEnabled } from '../../themes/theme-config.js';

/**
 * Behavior that exposes the branding configuration as a reflected `rebrand` boolean property.
 *
 * Elements can use this to:
 * - Apply branding-specific styles with `:host([rebrand])` selectors
 * - Conditionally render branding-specific DOM with `[[rebrand]]` bindings
 *
 * The `rebrand` value is determined once at startup by reading `isBrandingEnabled()`
 * from `themes/theme-config.js` and does not change at runtime.
 *
 * @polymerBehavior Nuxeo.BrandingBehavior
 */
export const BrandingBehavior = {
  properties: {
    /** True when the Hyland branding themes are enabled; reflected to `:host([rebrand])`. */
    rebrand: {
      type: Boolean,
      reflectToAttribute: true,
      value() {
        return isBrandingEnabled();
      },
    },
  },
};
