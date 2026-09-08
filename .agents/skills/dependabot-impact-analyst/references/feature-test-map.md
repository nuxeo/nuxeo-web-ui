# Feature → test → sanity map (Nuxeo Web UI)

Maps a dependency (or the feature it powers) to the **unit test file(s)** to run and the **manual sanity steps** for a QA/dev. Used by the `dependabot-fix` skill (to run targeted tests) and the `dependabot-impact-analyst` agent (to build the sanity checklist).

This map is written from the **Web UI feature's** point of view and is used **regardless of which repo is primary** (`nuxeo-web-ui` or `nuxeo-elements`) — a nuxeo-elements dependency only ever becomes user-visible through one of these Web UI features, so the same rows apply once you've mapped the elements-side usage to a feature. For `nuxeo-elements`-primary tickets, also run the affected workspace's own targeted script (`npm run test:core` / `test:ui` / `test:dataviz`) before/alongside the `test/*.test.js` file listed here.

This is a *maintained* map — it will not cover every package. When a package isn't listed, fall back to grepping usage and reasoning from the nearest feature row. When you discover a new package↔feature link during an analysis, add a row here.

Test files live in `test/*.test.js`, but a suite must load `test/setup.js` first (it defines the `expect`/`sinon` globals, via the generated `test/load-all-tests.js` barrel). So filter by **suite name** — never run a file directly:
`npx web-test-runner --grep '<suite-name>'` (e.g. `--grep 'nuxeo-analytics'`). Running `--files test/<name>.test.js` on its own skips setup and fails on missing globals.

| Package / category | Web UI feature | Unit test file(s) | Manual sanity (what to click, what "good" looks like) |
| --- | --- | --- | --- |
| `@nuxeo/chart-elements`, `@nuxeo/nuxeo-dataviz-elements`, d3, chart.js, highcharts | Analytics dashboards & charts | `nuxeo-chart-data-behavior.test.js`, `nuxeo-analytics.test.js`, `nuxeo-distribution-analytics.test.js`, `nuxeo-repository-analytics.test.js`, `nuxeo-search-analytics.test.js`, `nuxeo-workflow-analytics.test.js` | Open Analytics + each dashboard tab (distribution, repository, search, workflow). Charts must **render with data, axes, legends and tooltips** — not blank/NaN. This is the category that previously shipped a prod defect; unit tests pass while the chart renders empty, so a visual check is mandatory. |
| `@nuxeo/nuxeo-elements` (workflow graph), dagre/graph libs | Workflow graph diagram | `nuxeo-workflow-graph.test.js` | Open a document with a running workflow → workflow graph tab. Nodes/edges draw, layout isn't collapsed, current step highlighted. |
| document viewer / preview / PDF / image libs | Document preview | `nuxeo-document-viewer.test.js` | Preview a PDF, image, and video document. Viewer loads, pages/zoom work, no console errors. |
| `@nuxeo/moment`, moment, date-fns, formatjs | Dates, times, relative timestamps, i18n | `nuxeo-picture-formats.test.js`, plus any layout using date widgets | Check created/modified columns, audit timestamps, date filters, and a non-English locale. Dates format correctly and relative times ("2 hours ago") render. |
| `nuxeo` (JS client), data layer | Everything that talks to the backend | `nuxeo-app.test.js`, `nuxeo-default-results.test.js`, `nuxeo-results.test.js` | Login, browse a folder, run a search, open a document. Core data flows must work; watch the network tab for failed calls. |
| search / suggester / results | Search & results grids | `nuxeo-search-form.test.js`, `nuxeo-default-search-form.test.js`, `nuxeo-audit-search.test.js`, `nuxeo-saved-search-actions.test.js`, `nuxeo-suggester.test.js`, `nuxeo-results.test.js` | Run quick search + a saved search, use the suggester (type-ahead), sort/paginate results. |
| blob / upload libs | File upload & blobs | `nuxeo-document-blob.test.js`, `nuxeo-replace-blob-button.test.js` | Upload a file, replace a blob, download. Progress + completion work. |
| `webpack-dev-server`, `http-proxy-middleware`, webpack plugins/loaders, eslint/prettier, test runner | **Dev/build tooling only** | n/a (not shipped) | No end-user sanity. Verify `npm start` boots and proxies to the backend, and `npm run build` produces a bundle. |
| lit, `@polymer/*`, `@nuxeo/page` | Rendering / routing framework | broad — run the full suite | High blast radius: routing and every element render through this. Smoke every major view (browse, document, search, admin) and check navigation/deep links. |

## Notes
- The full unit suite runs in CI (`npm test`). Use this map to run the **specific** file(s) locally when the impact is high-risk, so you get fast signal without the whole browser suite.
- Functional (e2e) tests live under `packages/nuxeo-web-ui-ftest` and run in CI; call them out for framework/data-layer changes.
