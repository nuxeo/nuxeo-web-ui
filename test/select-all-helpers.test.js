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
import { isPageProviderDisplayBehavior } from '../elements/select-all-helpers.js';

suite('select-all-helpers', () => {
  suite('isPageProviderDisplayBehavior', () => {
    test('should return false for null or undefined', () => {
      expect(isPageProviderDisplayBehavior(null)).to.not.be.ok;
      expect(isPageProviderDisplayBehavior(undefined)).to.not.be.ok;
    });

    test('should return false if element has no behaviors', () => {
      expect(isPageProviderDisplayBehavior({})).to.not.be.ok;
      expect(isPageProviderDisplayBehavior({ behaviors: null })).to.not.be.ok;
    });

    test('should return false if selectAllActive is missing', () => {
      const el = { behaviors: [], selectAllActive: false };
      expect(isPageProviderDisplayBehavior(el)).to.not.be.ok;
    });
  });
});
