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

import { coverageModulePaths } from '../coverage-imports-data.js';

// Only registered by Karma when argv includes --coverage (see karma.conf.js). Loaded last
// in `files` so bulk imports do not run first and pollute globals (I18n, XHR, etc.).

suite('Coverage: materialize all app modules for Istanbul', function () {
  this.timeout(0);

  test('dynamically import every listed module so unexecuted code counts toward total coverage', async function () {
    if (coverageModulePaths.length === 0) {
      expect.fail(
        'test/coverage-imports-data.js has no paths. Run: node scripts/generate-coverage-imports.js (or npm run update-coverage-imports). npm test runs the generator automatically.',
      );
    }
    const root = new URL('../../', import.meta.url);
    const failures = [];
    await Promise.all(
      coverageModulePaths.map((p) => {
        const href = new URL(p, root).href;
        return import(href).catch((err) => {
          failures.push({ specifier: p, err });
        });
      }),
    );
    if (failures.length) {
      const message = failures
        .map((f) => `${f.specifier}: ${f.err && f.err.message ? f.err.message : f.err}`)
        .join('\n');
      // eslint-disable-next-line no-console
      console.error(
        `coverage-app-modules: ${failures.length} of ${coverageModulePaths.length} modules failed to load:\n${message}`,
      );
      expect(failures, 'every app module should load in the test environment').to.have.length(0);
    }
  });
});
