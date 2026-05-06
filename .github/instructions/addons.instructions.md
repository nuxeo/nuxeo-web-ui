---
applyTo: "addons/**"
---

# Addons

## Structure

Each addon lives in `addons/<addon-name>/` with an `index.js` entry point that is dynamically loaded by the main app.

## Loading

- Addon entry points are imported from `Nuxeo.UI.bundles`, which is populated from the `NUXEO_PACKAGES` env var (space/comma separated)
- `nuxeo-spreadsheet` is always imported regardless of `NUXEO_PACKAGES`
- If `NUXEO_PACKAGES` is unset or empty, no addon entry points are imported (except spreadsheet), but all addon resources (HTML, images, i18n) are still copied to the build
- Addon elements register themselves on import (side-effect imports); copying resources alone does not load an addon

## Available Addons

- `amazon-s3-online-storage` — S3 direct upload
- `easyshare` — Public sharing links
- `nuxeo-csv` — CSV bulk import
- `nuxeo-drive` — Desktop sync integration
- `nuxeo-imap-connector` — Email connector
- `nuxeo-liveconnect` — Cloud storage providers (Google Drive, Dropbox, Box, OneDrive)
- `nuxeo-platform-3d` — 3D model viewer
- `nuxeo-spreadsheet` — Inline spreadsheet editing
- `nuxeo-template-rendering` — Document template generation
- `nuxeo-wopi` — Office Online editing

## Addon Contents

Addons can include:
- `index.js` — JS entry point (dynamically imported)
- `*.html` — HTML imports for Polymer elements
- `elements/` — Additional web components
- `images/` — Icons and assets
- `i18n/` — Addon-specific translations (merged by `scripts/merge-messages.js`)

## Conventions

- Follow the same Polymer legacy patterns as `elements/`
- Addon elements use `nuxeo-` prefix
- Each addon should be self-contained and not depend on other addons
