---
applyTo: "addons/**"
---

# Addons

## Structure

Each addon lives in `addons/<name>/` with an `index.js` entry point. Addons are dynamically imported at boot time.

## Available Addons

- `amazon-s3-online-storage` — S3 direct upload
- `easyshare` — Public sharing links
- `nuxeo-csv` — CSV bulk import
- `nuxeo-drive` — Desktop sync client
- `nuxeo-imap-connector` — Email integration
- `nuxeo-liveconnect` — Cloud file providers (Google Drive, Box, Dropbox, OneDrive)
- `nuxeo-platform-3d` — 3D model viewer
- `nuxeo-spreadsheet` — Inline spreadsheet editing
- `nuxeo-template-rendering` — Document template generation
- `nuxeo-wopi` — Office Online editing

## Loading

Controlled by `NUXEO_PACKAGES` env var (space/comma separated). This populates `Nuxeo.UI.bundles`, which `index.js` uses to dynamically import addon entry points. `nuxeo-spreadsheet` is always imported regardless. If `NUXEO_PACKAGES` is unset or empty, no addon entry points are imported (except spreadsheet), but all addon resources (HTML, images, i18n) are still copied to the build.

Addons can include:
- `index.js` — JS entry point (dynamically imported)
- `*.html` — HTML imports for Polymer elements
- `elements/` — Additional web components
- `images/` — Icons and assets
- `i18n/` — Addon-specific translations (merged by `scripts/merge-messages.js`)

## Conventions

- Follow the same Polymer patterns as `elements/`
- Add i18n keys to the addon's own `i18n/` directory, not the root `i18n/`
- Addon elements should use `nuxeo-` prefix like all other elements
