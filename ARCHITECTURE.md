# Nuxeo Web UI — Architecture

## System Overview

Nuxeo Web UI is a single-page application (SPA) that serves as the standard user interface for the Nuxeo content services platform. It runs entirely in the browser and communicates with a Nuxeo Server backend via REST APIs through declarative web component wrappers.

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Nuxeo Web UI (Polymer 3 SPA)                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  │  │
│  │  │ nuxeo-app│  │ routing  │  │  layouts  │  │  addons  │  │  │
│  │  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘  │  │
│  │       └──────────────┴──────────────┴─────────────┘         │  │
│  │                         │                                    │  │
│  │  ┌──────────────────────┴───────────────────────────────┐   │  │
│  │  │  @nuxeo/nuxeo-ui-elements (shared UI components)     │   │  │
│  │  │  @nuxeo/nuxeo-elements (data access components)      │   │  │
│  │  │  @nuxeo/nuxeo-dataviz-elements (analytics/charts)    │   │  │
│  │  └──────────────────────┬───────────────────────────────┘   │  │
│  └─────────────────────────┼───────────────────────────────────┘  │
│                            │ REST / Automation API                 │
└────────────────────────────┼──────────────────────────────────────┘
                             │
┌────────────────────────────┼──────────────────────────────────────┐
│  Nuxeo Server (Java)       │                                      │
│  ┌─────────────────────────┴───────────────────────────────────┐  │
│  │  REST API / Automation Framework / Page Providers            │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | Polymer 3 (legacy factory pattern) | ^3.5.1 |
| Web Components Polyfills | @webcomponents/webcomponentsjs | ^2.0 |
| Bundler | Webpack 5 | ^5.3 |
| Package Manager | npm | ≥ 8 |
| Node.js | Node.js | ≥ 18 |
| Unit Testing | @web/test-runner + Mocha + Chai + Sinon | Various |
| Functional Testing | WebdriverIO 9 + Cucumber | ^9.12 |
| Linting | ESLint 9 (flat config) + Prettier | ^9.0 / ^3.8 |
| Java Build | Maven | Java 21 |
| Deployment | Docker (Nginx + Nuxeo) | — |

## Boot Sequence

The application bootstrap in `index.js` follows a strict promise chain:

```
1. disableRobotoFont()    → Prevent Polymer font loading
2. setupRTLSupport()      → Detect RTL languages, set document.dir
3. loadApp()              → Import elements/nuxeo-app.js (root element)
4. loadLegacy()           → Import legacy.js (polyfills, compat)
5. loadBundle()           → Import elements/nuxeo-web-ui-bundle.html (all components)
6. setupApp()             → Wait for <nuxeo-app> to be defined, configure
7. loadRouting()          → Import elements/routing.js (register all routes)
8. loadAddons()           → Dynamically import addon bundles from Nuxeo.UI.bundles
```

For automation (WebDriver) scenarios, the boot waits for a custom `automation-ready` DOM event before starting.

## Component Architecture

### Element Hierarchy

```
<nuxeo-app>                         ← Root element (elements/nuxeo-app.js)
├── <nuxeo-connection>              ← Server connection (from @nuxeo/nuxeo-elements)
├── <paper-drawer-panel>            ← Left sidebar + main area
│   ├── Sidebar
│   │   ├── <nuxeo-menu-icon>       ← Navigation icons
│   │   └── <nuxeo-menu-item>       ← Navigation entries
│   └── Main Content
│       ├── <nuxeo-breadcrumb>      ← Path navigation
│       └── <iron-pages>            ← Page router
│           ├── <nuxeo-home>        ← Dashboard
│           ├── <nuxeo-browser>     ← Document browsing
│           ├── <nuxeo-search-page> ← Search interface
│           ├── <nuxeo-tasks>       ← Workflow tasks
│           ├── <nuxeo-admin>       ← Administration
│           └── <nuxeo-diff-page>   ← Document comparison
└── <nuxeo-document-create-popup>   ← Modal document creation
```

### Element Patterns

**Legacy Polymer elements** (majority of the codebase):

```javascript
Polymer({
  is: 'nuxeo-my-element',
  _template: html`<style>...</style><div>...</div>`,
  behaviors: [FormatBehavior, RoutingBehavior],
  properties: {
    document: { type: Object, notify: true },
  },
  _myMethod() { ... },
});
```

**HTML-based elements** (layouts and some components):

```html
<dom-module id="nuxeo-my-layout">
  <template>
    <style>...</style>
    <nuxeo-input value="{{document.properties.dc:title}}"></nuxeo-input>
  </template>
  <script>
    Polymer({ is: 'nuxeo-my-layout', behaviors: [...] });
  </script>
</dom-module>
```

### Data Access Layer

In UI components and application code, server communication should go through declarative Nuxeo Elements rather than calling REST endpoints with raw `fetch()` or `XMLHttpRequest` directly:

| Element | Purpose |
|---|---|
| `<nuxeo-connection>` | Server connection & authentication |
| `<nuxeo-document>` | CRUD operations on documents |
| `<nuxeo-resource>` | Generic REST resource calls |
| `<nuxeo-operation>` | Nuxeo Automation operation calls |
| `<nuxeo-page-provider>` | Paginated queries / search |
| `<nuxeo-task-page-provider>` | Workflow task queries |

### Behaviors (Shared Logic)

Polymer behaviors are the equivalent of mixins. Key behaviors used across the app:

| Behavior | Source | Purpose |
|---|---|---|
| `FiltersBehavior` | `nuxeo-ui-elements` | Document type/facet filtering |
| `FormatBehavior` | `nuxeo-ui-elements` | Date/number/file size formatting |
| `RoutingBehavior` | `nuxeo-ui-elements` | URL generation, navigation helpers |
| `I18nBehavior` | `nuxeo-ui-elements` | Internationalization (`this.i18n()`) |
| `DocumentCreationBehavior` | local | Document creation wizards |

## Routing

Client-side routing uses `@nuxeo/page` (a fork of page.js) in hashbang mode:

| Route Pattern | Target | Description |
|---|---|---|
| `/` | → `/home` | Redirect to dashboard |
| `/home` | `nuxeo-home` | User dashboard |
| `/browse/*path` | `nuxeo-browser` | Document tree browsing |
| `/doc/:repo?/:id/` | `nuxeo-browser` | Direct document access by ID |
| `/search/:name` | `nuxeo-search-page` | Named search forms |
| `/admin/:tab?` | `nuxeo-admin` | Admin console (requires admin/powerusers) |
| `/tasks` | `nuxeo-tasks` | Workflow task list |
| `/tasks/:repo?/:id/` | `nuxeo-tasks` | Workflow task view by ID |
| `/diff/:id1/:id2` | `nuxeo-diff-page` | Side-by-side comparison |
| `/user/:id` | → admin redirect | User management |
| `/group/:id` | → admin redirect | Group management |

The router also exposes `app.router` helper methods for URL generation: `router.browse(path)`, `router.document(id)`, `router.search(name)`, etc.

## Layout System

Document rendering uses a convention-based layout system. Layouts are resolved by document type and view mode:

```
elements/document/<doctype>/nuxeo-<doctype>-<mode>-layout.html
```

**Modes**: `view`, `edit`, `metadata`, `create`

**Example**: `elements/document/file/nuxeo-file-view-layout.html`

Supported document types with custom layouts:
`audio`, `collection`, `collections`, `domain`, `favorites`, `file`, `folder`, `note`, `orderedfolder`, `picture`, `picturebook`, `root`, `section`, `sectionroot`, `template`, `templateroot`, `userworkspacesroot`, `video`, `workspace`, `workspaceroot`

Search forms follow a similar pattern:
```
elements/search/<name>/nuxeo-<name>-search-form.html
```

## Addon System

Addons extend Web UI with optional functionality. Each addon lives in `addons/<name>/` with an `index.js` entry point.

```
addons/
├── amazon-s3-online-storage/    → S3 direct upload
├── easyshare/                   → Public document sharing
├── nuxeo-csv/                   → CSV import
├── nuxeo-drive/                 → Desktop sync client integration
├── nuxeo-imap-connector/        → Email connector
├── nuxeo-liveconnect/           → Cloud file provider links
├── nuxeo-platform-3d/           → 3D model viewer
├── nuxeo-spreadsheet/           → Inline spreadsheet editing
├── nuxeo-template-rendering/    → Document template rendering
└── nuxeo-wopi/                  → Office Online integration
```

Addon loading is a two-step process. During the build, webpack injects `Nuxeo.UI.bundles` from the `NUXEO_PACKAGES` environment variable and copies addon resources (HTML layouts, images, i18n) to the output. At runtime, `index.js` dynamically imports the bundles listed in `Nuxeo.UI.bundles` and always appends `nuxeo-spreadsheet`. If `NUXEO_PACKAGES` is unset or empty, `Nuxeo.UI.bundles` is `[]` and only `nuxeo-spreadsheet` is imported, though all addon resources are still copied to the build.

## Theming

Two built-in themes in `themes/`:

| Theme | Directory |
|---|---|
| Default | `themes/default/theme.html` |
| Dark | `themes/dark/theme.html` |

Base styles are in `themes/base.js` and `themes/loader.js` handles dynamic theme switching.

## Internationalization (i18n)

- 16 languages: ar, cs, de, es-ES, eu, fr, he, id, it, ja, nl, pl, pt-PT, sv-SE, zh-CN + English default
- Message files: `i18n/messages.json` (English), `i18n/messages-<locale>.json`
- Build step `scripts/merge-messages.js` merges messages from addons and `nuxeo-ui-elements` into `.tmp/i18n/`
- Runtime access: `this.i18n('key')` in JS or `[[i18n('key')]]` in Polymer templates
- RTL support: auto-detected at boot from browser language

## Build Pipeline

### Development

```
npm start → webpack-dev-server → proxies /nuxeo to NUXEO_HOST (default localhost:8080)
```

### Production

```
npm run build → webpack (production mode) → dist/
  ├── index.html (HtmlWebpackPlugin)
  ├── main.bundle.js (app + elements)
  ├── vendor/ (polyfills, moment, pdfjs, cropperjs)
  ├── fonts/
  ├── i18n/ (merged messages)
  └── elements/**/*.html (copied layouts)
```

Post-build `fix:*` scripts rewrite paths for production deployment.

### Maven Integration

```
mvn clean install
  → plugin/web-ui/addon     → Nuxeo addon JAR
  → plugin/web-ui/marketplace → Marketplace ZIP package
  → (with -Pftest) plugin/itests/ → integration tests
  → (with -Pa11y)  plugin/a11y/   → accessibility tests
  → (with -Pmetrics) plugin/metrics/ → performance metrics
```

## Deployment

### Docker Compose

Three-service architecture in `docker-compose.yml`:

```
proxy (nginx) :8080 → routes to:
  ├── /nuxeo/* → nuxeo (Nuxeo Server)
  └── /*       → webui (Nginx serving dist/)
```

### Configuration

Environment variables control deployment:
- `NUXEO_VERSION` — Nuxeo server image tag
- `NUXEO_WEB_UI_VERSION` — Web UI image tag
- `NUXEO_PACKAGES` — Marketplace packages to install
- `NUXEO_DEV_MODE` — Enable hot-reload in server
- `NUXEO_CLID` — License key

## CI/CD (GitHub Actions)

Workflow orchestration in `.github/workflows/main.yaml`:

```
Push to the lts-2025 branch triggers:
  lint    → ESLint + Prettier check
  test    → Web Test Runner unit tests (single entry: test/load-all-tests.js)
  a11y    → Accessibility tests
  ftest   → WebdriverIO functional tests
  build   → (depends on all above) Maven marketplace build
```

Additional workflows: `preview.yaml` (PR preview environments), `cross-repo.yaml` (nuxeo-elements coordination), `crowdin.yaml` (translation sync), `promote.yaml` (release promotion).

## Key Directories Reference

| Path | Description |
|---|---|
| `elements/` | All Polymer web components |
| `elements/document/` | Per-doctype view/edit/metadata/create layouts |
| `elements/search/` | Search form layouts |
| `elements/nuxeo-admin/` | Admin console components |
| `elements/nuxeo-browser/` | Document browser, breadcrumb |
| `elements/nuxeo-app/` | App shell sub-components (menu, page, progress) |
| `addons/` | Optional feature bundles |
| `i18n/` | Translation files |
| `themes/` | Visual themes |
| `test/` | Unit tests |
| `ftest/` | Functional test feature files |
| `packages/nuxeo-web-ui-ftest/` | WDIO framework (page objects, steps) |
| `plugin/` | Maven modules (addon, marketplace, itests, a11y, metrics) |
| `scripts/` | Build helpers (`merge-messages.js`, `test/unit/`, `test/ftest/`) |
| `server/` | Nginx configs for Docker |
