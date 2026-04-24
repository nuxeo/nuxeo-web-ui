---
applyTo: "addons/**"
---

# Addons

## Structure

Each addon lives in `addons/<addon-name>/` with an `index.js` entry point that is dynamically loaded by the main app.

## Loading

- All addons are bundled by default unless `NUXEO_PACKAGES` env var restricts the list
- Entry points are imported via dynamic `import()` in the app bootstrap (`index.js`)
- Addon elements register themselves on import (side-effect imports)

## Available Addons

- `amazon-s3-online-storage` — S3 direct upload
- `easyshare` — Public sharing links
- `nuxeo-csv` — CSV bulk import
- `nuxeo-drive` — Desktop sync integration
- `nuxeo-imap-connector` — Email connector
- `nuxeo-liveconnect` — Cloud storage providers (Google Drive, Dropbox, Box, OneDrive)
- `nuxeo-platform-3d` — 3D model viewer
- `nuxeo-spreadsheet` — Spreadsheet-style bulk editing
- `nuxeo-template-rendering` — Template-based document generation
- `nuxeo-wopi` — Microsoft Office Online integration

## Conventions

- Follow the same Polymer legacy patterns as `elements/`
- Addon elements use `nuxeo-` prefix
- Each addon should be self-contained and not depend on other addons
