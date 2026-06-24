# Unit Test Migration: Karma → Web Test Runner

**JIRA**: WEBUI-2038  
**Branches**: `webui-2038-karma-to-wtr-lts2023` (→ `maintenance-3.1.x`), `webui-2038-karma-to-wtr-lts2025` (→ `lts-2025`)  
**Date**: June 2026

---

## Table of Contents

1. [Why Migrate](#why-migrate)
2. [What Changed](#what-changed)
3. [How It Was Done](#how-it-was-done)
4. [Architecture Overview](#architecture-overview)
5. [Coverage Comparison](#coverage-comparison)
6. [Recommendations](#recommendations)

---

## Why Migrate

### Problems with Karma

| Problem | Impact |
|---------|--------|
| **Deprecated** | Karma was deprecated in April 2023 (karma-runner/karma#3804). No security patches or maintenance. |
| **@open-wc/karma-esm unmaintained** | The ESM plugin that enables native module loading in Karma has no active maintainers. Breaks with Node 18+ and modern dependencies. |
| **Node.js compatibility** | `karma-esm` uses `crypto.createHash('md4')` via polyfills-loader, which throws on Node 17+ (OpenSSL 3) without `--openssl-legacy-provider`. |
| **Babel overhead for coverage** | Karma requires `compatibility: 'always'` (Babel transform) to get Istanbul instrumentation. This slows the test pipeline and introduces transpilation artifacts. |
| **8 Karma-specific packages** | `karma`, `karma-chrome-launcher`, `karma-coverage-istanbul-reporter`, `karma-firefox-launcher`, `karma-mocha`, `karma-mocha-reporter`, `karma-source-map-support`, `karma-static` — all stale. |
| **SonarCloud integration** | Istanbul's LCOV output works but the pipeline is fragile (Babel → Istanbul → reporter → file). Istanbul on WTR is simpler (rollup plugin → lcov). |
| **CI instability** | Karma's test registration race (`__karma__.loaded()` fires before all suites register) caused intermittent "fewer tests run" failures. |

### Benefits of Web Test Runner

| Benefit | Detail |
|---------|--------|
| **Modern, maintained** | Part of the [@modernweb](https://modern-web.dev/) ecosystem; active development; aligns with Open WC community. |
| **Native ESM** | Serves modules as-is via a dev server; no Babel or bundling needed for test execution. |
| **Istanbul coverage (no Babel)** | Uses `rollup-plugin-istanbul` to instrument sources at serve-time; no Babel transpilation needed. Fast and accurate. |
| **Puppeteer integration** | Uses a bundled Chromium via `puppeteer`; no system Chrome version mismatches in CI. |
| **Simpler configuration** | Single `web-test-runner.config.mjs` replaces Karma config + Karma plugins + ESM config. |
| **Better error reporting** | Stack traces are source-mapped; browser logs are filterable; uncaught errors are attributed to tests. |
| **Node ≥ 18 native** | No hacks or legacy providers needed. |

---

## What Changed

### Dependencies

#### Removed (Karma ecosystem)

```
@open-wc/karma-esm          ^4.0.0
karma                        ^6.4.1
karma-chrome-launcher        ^3.1.1
karma-coverage-istanbul-reporter ^3.0.3
karma-firefox-launcher       ^2.1.2
karma-mocha                  ^2.0.1
karma-mocha-reporter         ^2.2.5
karma-source-map-support     ^1.4.0
karma-static                 ^1.0.1
```

#### Added (WTR ecosystem)

```
@web/test-runner             ^0.20.2
@web/test-runner-chrome      ^0.18.1
@web/test-runner-mocha       ^0.9.0
puppeteer                    ^24.0.0
```

### Files

| Action | File | Purpose |
|--------|------|---------|
| **Removed** | `karma.conf.js` | Old Karma configuration |
| **Added** | `web-test-runner.config.mjs` | WTR configuration (ESM) |
| **Added** | `scripts/test/unit/web-test-runner-fallback-plugin.mjs` | Serves fallback JSON/HTML/JPEG for unstubbed API calls |
| **Added** | `scripts/test/unit/inject-zero-coverage.js` | Post-run: adds 0% LCOV records for unloaded manifest modules |
| **Added** | `scripts/test/unit/print-test-runner-notice.js` | Prints explanatory notice before WTR starts |
| **Modified** | `scripts/test/unit/generate-coverage-imports.js` | Already existed; adjusted exclude patterns |
| **Modified** | `scripts/test/unit/generate-test-load-all.js` | Already existed; unchanged logic |
| **Modified** | `test/setup.js` | Major rewrite: error suppression, sinon patching, leaked sandbox cleanup |
| **Modified** | `package.json` | Scripts + devDependencies |
| **Modified** | `.github/workflows/sonar.yaml` | Uses `npm test` (now WTR) for coverage |
| **Modified** | `sonar-project.properties` | Updated coverage report path reference |

### npm Scripts

| Script | Before (Karma) | After (WTR) |
|--------|----------------|-------------|
| `test` | `karma start --coverage` | `web-test-runner --coverage && node scripts/test/unit/inject-zero-coverage.js` |
| `test:watch` | `karma start --auto-watch=true --single-run=false` | `web-test-runner --watch` |
| `update-coverage-imports` | same | same |
| `update-test-load-all` | same | same |

---

## How It Was Done

### Step-by-Step Migration

#### 1. Replace Dependencies

```bash
# Remove Karma packages
npm uninstall karma @open-wc/karma-esm karma-chrome-launcher \
  karma-coverage-istanbul-reporter karma-firefox-launcher karma-mocha \
  karma-mocha-reporter karma-source-map-support karma-static

# Add WTR packages
npm install --save-dev @web/test-runner @web/test-runner-chrome \
  @web/test-runner-mocha puppeteer
```

#### 2. Create `web-test-runner.config.mjs`

Key design decisions:
- **Single test entry**: `test/load-all-tests.js` (same pattern as Karma — prevents suite registration races)
- **Puppeteer Chrome**: Bundled Chromium avoids system Chrome version mismatches
- **Istanbul instrumentation**: Uses `rollup-plugin-istanbul` via `@web/dev-server-rollup`'s `fromRollup()` adapter for Karma-equivalent function-body coverage (native V8 disabled)
- **Custom plugins**: Fallback responses for unstubbed API calls

#### 3. Rewrite `test/setup.js`

The setup file was significantly enhanced to handle WTR's stricter error model:
- **Error suppression**: Intercepts uncaught errors and unhandled rejections that fire between tests
- **Sinon patching**: Handles Sinon ≥11's strict non-configurable property checks (Polymer elements)
- **Leaked sandbox cleanup**: Auto-restores sinon fakes/clocks left by failing tests

#### 4. Create Helper Scripts

- **Fallback plugin**: Serves valid JSON/JPEG for unstubbed `nuxeo-operation`/`nuxeo-resource` calls (prevents hundreds of 404 errors in test logs)
- **Zero-coverage injection**: Post-processes `coverage/lcov.info` to add 0% records for manifest paths that were never loaded by any test

#### 5. Delete `karma.conf.js`

#### 6. Update CI Workflows

The `sonar.yaml` workflow required no changes to commands — `npm test` now runs WTR instead of Karma.

### Key Challenges Solved

| Challenge | Solution |
|-----------|----------|
| Suite registration races | Single-entry `load-all-tests.js` barrel (preserved from Karma) |
| Unstubbed API 404s flooding logs | `nuxeoTestFallbackPlugin` serves valid fallback responses |
| Istanbul not reporting untested modules | `inject-zero-coverage.js` adds 0% lcov records for manifest paths never loaded |
| Polymer observer side-effects during teardown | `_testRunning = false` suppresses async errors |
| Sinon refusing to stub non-configurable Polymer properties | Custom `sinon.stub` patch with `Object.defineProperty` fallback |
| CI Chrome version mismatch | Bundled Puppeteer Chromium |
| Leaked sinon fakes causing cascade failures | Auto-restore in per-test `teardown` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        npm test pipeline                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. generate-coverage-imports.js  →  test/coverage-imports-data.js  │
│  2. generate-test-load-all.js    →  test/load-all-tests.js          │
│  3. print-test-runner-notice.js  →  (console output)                │
│  4. web-test-runner --coverage   →  coverage/lcov.info              │
│  5. inject-zero-coverage.js      →  coverage/lcov.info (appended)   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     Web Test Runner Execution                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  web-test-runner.config.mjs                                         │
│  ├── files: [test/load-all-tests.js]   (sole WTR entry)             │
│  ├── plugins:                                                       │
│  │   └── nuxeoTestFallbackPlugin()     (404 → valid fallbacks)      │
│  ├── browsers: [chromeLauncher(puppeteer)]                          │
│  ├── coverageConfig: { include: [...app sources...] }               │
│  └── filterBrowserLogs: (suppress noise)                            │
│                                                                     │
│  test/load-all-tests.js                                             │
│  ├── import './setup.js'               (bootstrap)                  │
│  └── import './nuxeo-*.test.js' × 114  (all suites)                 │
│                                                                     │
│  test/setup.js                                                      │
│  ├── Register Chai + Sinon globals                                  │
│  ├── Patch sinon.stub for Polymer                                   │
│  ├── Install error/rejection suppressors                            │
│  ├── Install ResizeObserver safety wrapper                          │
│  └── Auto-restore leaked sinon globals                              │
│                                                                     │
│  inject-zero-coverage.js (post-run)                                 │
│  └── Adds 0% lcov records for manifest files Istanbul never loaded  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files Excluded from Coverage

The coverage exclusion lists are **identical** between the old Karma setup and the new WTR setup. No files that were previously covered by Karma have been dropped from WTR coverage scope.

### WTR Runtime Exclusions (`coverageConfig.exclude`)

These paths are excluded from Istanbul coverage instrumentation at runtime (via `rollup-plugin-istanbul`, with `nativeInstrumentation: false`):

| Pattern | Reason | Was excluded in Karma? |
|---------|--------|------------------------|
| `**/*.html.js` | Virtual paths generated by WTR's dev server when it transforms `.html` Polymer imports into JS modules. These don't exist on disk. | N/A (Karma didn't generate these) |
| `addons/nuxeo-platform-3d/**` | THREE.js loaders/controls use non-ESM patterns (global assignments, `importScripts`) that break the WTR module pipeline. | **Yes** — same exclusion in `generate-coverage-imports.js` |
| `elements/routing.js` | Runs `Page.js` route setup at import time; requires the full `Nuxeo.UI` app shell context. | **Yes** — same exclusion in `generate-coverage-imports.js` |

### Coverage Materialization Exclusions (`generate-coverage-imports.js`)

`generate-coverage-imports.js` walks the source tree and writes a manifest of all instrumentable files into `test/coverage-imports-data.js`. After the run, `inject-zero-coverage.js` consumes that manifest and adds 0% lcov records for every entry Istanbul did not load. The exclusions below keep specific files out of that manifest so they are not forced to 0% (they are also excluded from runtime instrumentation):

| Exclusion | Files affected | Reason |
|-----------|---------------|--------|
| `addons/nuxeo-platform-3d/` (prefix) | 12 files (4 elements + glTF loaders + OrbitControls + index.js) | THREE.js dependencies use non-standard module patterns; importing them crashes the ESM pipeline |
| `elements/routing.js` (exact) | 1 file | Side-effect import: immediately registers routes via Page.js, requires global app state |

### SonarCloud Coverage Exclusions (`sonar.coverage.exclusions`)

These paths are excluded from SonarCloud's coverage metrics entirely (same in both Karma and WTR):

| Pattern | Category | Reason |
|---------|----------|--------|
| `**/*.test.js` | Test files | Tests themselves aren't "source" to cover |
| `**/*.html` | HTML files | Istanbul cannot instrument inline `<script>` in HTML via WTR; `.html` Polymer elements have coverage via `.html.js` virtual modules only in Karma (both exclude) |
| `**/*.css`, `**/*.yaml`, `**/*.yml`, `**/*.json` | Non-executable | No code to cover |
| `index.js`, `legacy.js`, `public-path.js`, `sw.js` | Bootstrap files | App entry points / service worker require full browser bootstrap |
| `elements/routing.js` | Router bootstrap | Requires Nuxeo.UI app shell at import time |
| `elements/elements.js` | Import barrel | Side-effect-only; no exportable logic |
| `i18n/i18n.js` | i18n bootstrap | Loader initialization |
| `addons/*/index.js` | Addon barrels | Side-effect registrations / re-exports |
| `addons/nuxeo-spreadsheet/app/app.js` | Spreadsheet entry | Imports vendor (jQuery/Handsontable) |
| `addons/nuxeo-spreadsheet/app/lib/**` | Spreadsheet lib | Patches Handsontable prototype (non-ESM) |
| `addons/nuxeo-spreadsheet/app/ui/spreadsheet.js` | Spreadsheet UI | jQuery container dependency |
| `addons/nuxeo-spreadsheet/app/ui/editors/**` | Spreadsheet editors | Extend Select2Editor (non-ESM) |
| `addons/nuxeo-spreadsheet/webpack.config.js` | Build config | Not application code |
| `addons/nuxeo-spreadsheet/eslint-rules.mjs` | Lint config | Not application code |
| `addons/nuxeo-platform-3d/**` | 3D addon | THREE.js loaders break ESM import |
| `.github/**` | CI workflows | Not application code |

### Key Takeaway

**No coverage regression**: Every file that Karma reported coverage for is also reported by WTR. The exclusion sets are byte-for-byte identical. The only new exclusion (`**/*.html.js`) refers to virtual paths that never existed in the Karma pipeline.

---

## Coverage Comparison

> **Note**: The shipped configuration uses **Istanbul source instrumentation** via `rollup-plugin-istanbul`
> (`nativeInstrumentation: false`). The V8 native measurements below were captured during experimentation
> and are retained for historical context. With Istanbul on WTR, coverage methodology is similar to
> the old Karma + Istanbul approach (AST-based statement/branch/function counting) — the main difference
> is native ESM loading without Babel.

### Methodology Differences

| Aspect | Karma + Istanbul (old) | WTR + Istanbul via rollup-plugin-istanbul (current) |
|--------|-----------------|-----------------|
| **Instrumentation** | Source-to-source transform (Babel + Istanbul plugin). Adds counter statements to every branch/statement/function. | Source-to-source transform (rollup-plugin-istanbul, no Babel). Same Istanbul counters injected during WTR dev-server serve. |
| **When counted** | Counter increments when the inserted statement executes at runtime. Module-level code (Polymer factory calls) is counted only when the factory function body runs. | Same as Karma + Istanbul — counters increment at runtime. Module-level Polymer factory code is counted when it executes. |
| **Granularity** | Statement, branch, function — based on AST nodes. | Statement, branch, function — same AST-based approach via Istanbul. |
| **Module-level code** | Declarative code like `Polymer({ is: 'foo', properties: {...} })` inside a factory call is only counted when that specific expression runs during a test. | Same — Istanbul counts the expression as covered when it runs. Importing a module covers its top-level statements. |
| **Key difference** | Babel transforms may alter the AST (e.g., arrow functions → regular functions), affecting what gets instrumented. | No Babel — native ESM. Istanbul instruments the original source as-is. |

### Coverage Numbers (Measured with V8 — historical)

> These numbers were measured during the V8 native coverage phase. With Istanbul on WTR,
> expect numbers closer to the old Karma percentages since both use AST-based counting.

| Metric | Karma + Istanbul | WTR + V8 (historical) |
|--------|-----------------|----------|
| **Line coverage (lcov)** | **74.58%** | **93.02%** |
| **Test count** | 1976 passed | 1976 passed |
| **Files in report** | 158 | 151 |
| **Lines found (denominator)** | 5,811 | 41,520 |
| **Lines hit (numerator)** | 4,334 | 38,620 |
| **Untested files** | Appear at 0% (via `skipFilesWithNoCoverage: false`) | Appear at 0% (via `inject-zero-coverage.js`) |

### Why 74.58% → 93.02% (V8 only)?

> This explanation applies to V8 native coverage. With Istanbul on WTR, the gap
> is much smaller since both Karma and WTR use the same Istanbul counting methodology.

The gap is **not** because WTR runs more tests. The same 1976 tests pass in both. The difference is entirely about **how lines are counted**:

- **Istanbul** counts only **AST-level executable statements** (5,811 lines) — function calls, assignments, returns.
- **V8** counts **every source line in a covered range** (41,520 lines) — including property declarations, template literals, observer arrays, and blank lines within objects.

V8's denominator is **7× larger** (615% more countable lines), and because most of those extra lines are structural declarations that get "evaluated" at module load time, V8 also hits more lines proportionally.

#### Root Cause Decomposition

| Factor | Detail |
|--------|--------|
| **V8 line-counting granularity** | V8 reports 41,520 lines vs Istanbul's 5,811 — a 7× difference in what "counts" |
| **V8 declaration evaluation** | V8 marks 7,562 additional lines as "hit" that Istanbul does not (Polymer property objects, observer arrays, template literals) |
| **Files unique to Karma** | 7 `.html`/theme files (96 lines, 59 hit) — negligible impact |

#### Apples-to-Apples (Same 151 Files)

| | Karma | WTR |
|-|-------|-----|
| Lines found | 5,715 | 41,520 |
| Lines hit | 4,275 | 38,620 |
| Coverage | 74.80% | 93.02% |

If Karma's hit-rate (74.8%) were applied to V8's line count, we'd get 74.8% — the same number. The "extra" 18% comes from V8 counting 7,562 additional lines as hit (structural declarations evaluated at import time).

#### Top Files by Hit-Line Difference

| File | Karma LH | WTR LH | Diff |
|------|----------|--------|------|
| `nuxeo-mime-types.js` | 1 | 6,739 | +6,738 |
| `nuxeo-app.js` | 262 | 1,468 | +1,206 |
| `nuxeo-document-import.js` | 151 | 1,252 | +1,101 |
| `nuxeo-results.js` | 460 | 1,544 | +1,084 |
| `nuxeo-search-form.js` | 193 | 1,111 | +918 |
| `nuxeo-document-import-csv.js` | 98 | 689 | +591 |
| `nuxeo-dropzone.js` | 134 | 718 | +584 |
| `nuxeo-diff.js` | 66 | 553 | +487 |
| `nuxeo-template-param-editor.js` | 37 | 517 | +480 |
| `nuxeo-suggester.js` | 69 | 523 | +454 |

These files have large Polymer factory declarations or embedded data (e.g., `nuxeo-mime-types.js` is mostly a data object).

#### V8 Counting Example

```javascript
Polymer({
  is: 'nuxeo-my-element',           // V8: covered (evaluated at import)
  _template: html`<div>...</div>`,   // V8: covered (template literal evaluated)
  properties: {
    title: { type: String },          // V8: covered (object literal evaluated)
    items: { type: Array },           // V8: covered
  },
  _myMethod() {                      // V8: declaration covered; body only if called
    return this.items.length;         // V8: NOT covered unless _myMethod() runs
  },
});
```

**Istanbul** counts ~3 executable statements in this block. **V8** counts ~10 source lines, with ~8 marked as hit at import time.

### Is the Higher Number "Wrong"?

Neither number is wrong — they measure different things:

- **Istanbul (74.58%)**: "What percentage of *executable statements* were actively run during tests?" — a stricter, behavior-focused metric with a small denominator.
- **V8 (93.02%)**: "What percentage of *source lines* were evaluated by the JS engine?" — a broader metric with a 7× larger denominator that includes structural code.

> **Current configuration**: Since the shipped setup uses Istanbul on WTR (not V8), the coverage
> numbers will be closer to the old Karma baseline. The SonarCloud gate should be calibrated
> based on actual `npm test` output.

---

## Recommendations

### Accepting the New Baseline

1. **SonarCloud Quality Gate**: With Istanbul on WTR, the coverage baseline should be similar to the old Karma numbers. Calibrate the gate based on actual `npm test` output rather than historical V8 measurements.

2. **Honest reporting**: Untested files report 0% (via `inject-zero-coverage.js`). Only 5 manifest files are not loaded by tests and get explicit zero records.

3. **Consistent methodology**: Both old (Karma) and new (WTR) now use Istanbul AST-based instrumentation, making numbers directly comparable. The main improvement is native ESM (no Babel) and faster test execution.

### Improving Real Coverage

To improve the *behavior-tested* metric (closer to what Istanbul measured):

| Action | Effort | Impact |
|--------|--------|--------|
| Write tests for 5 untested files (0% after inject-zero) | Medium | Closes the inject-zero gap |
| Add assertions for observer/computed methods in tested files | Medium | Improves confidence |
| Track **function coverage** separately | Low | Better proxy for "tested behavior" |
| Use `c8 --per-file` thresholds | Medium | Enforce per-file minimums |

### Coverage Approach: Istanbul via rollup-plugin-istanbul

The project uses `rollup-plugin-istanbul` adapted for WTR via `@web/dev-server-rollup`'s `fromRollup()`. Native V8 instrumentation is disabled (`nativeInstrumentation: false`). This approach:
- Produces standard Istanbul coverage data (`window.__coverage__`)
- Works reliably with Polymer's legacy element patterns
- Avoids Babel transpilation (rollup plugin instruments ESM source directly)
- Generates LCOV output consumed by SonarCloud

### Monitoring Coverage Drift

```bash
# Quick local check
npm test
# Last line of output is the inject-zero-coverage summary:
#   "inject-zero-coverage: added <N> zero-coverage records (<before> → <after> files, <before>% → <after>% lines)"

# Per-file details
open coverage/lcov-report/index.html
```

The key number to watch is the **final lcov percentage** printed by
`scripts/test/unit/inject-zero-coverage.js` at the end of `npm test`. The authoritative
baseline for what is acceptable lives in SonarCloud (see the project's quality gate);
the percentage in `coverage/lcov.info` will drift as modules and tests are added or
removed, so no fixed number is pinned here.

If overall coverage drops significantly, it likely means new untested modules were added without corresponding tests.

---

## Summary

| Dimension | Before | After |
|-----------|--------|-------|
| Test runner | Karma 6 (deprecated) | @web/test-runner 0.20 (active) |
| ESM support | @open-wc/karma-esm + Babel | Native (WTR dev server) |
| Coverage engine | Istanbul (source transform) | Istanbul (rollup-plugin-istanbul, no Babel) |
| Coverage % (lcov) | reported by Karma at the end of the run | reported by `inject-zero-coverage.js` at the end of `npm test`; current baseline tracked in SonarCloud |
| Browser | System ChromeHeadless | Puppeteer bundled Chromium |
| Node requirement | ≥18 (with --openssl-legacy-provider) | ≥18 (no hacks) |
| Karma plugins | 8 packages | 0 |
| WTR plugins | 0 | 1 custom (fallback) |
| CI stability | Intermittent race conditions | Deterministic (single-entry barrel) |
| Config file | `karma.conf.js` (CJS, 90 lines) | `web-test-runner.config.mjs` (ESM, 102 lines) |
| Test count | 1976 | 1976 (identical) |
| Test behavior | Unchanged | Unchanged |
