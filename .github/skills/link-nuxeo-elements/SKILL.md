---
name: link-nuxeo-elements
description: Link a local nuxeo-elements checkout for co-development with Nuxeo Web UI.
  Use this skill when the user wants to develop against a local nuxeo-elements repo,
  set up symlinks for @nuxeo packages, link sibling repositories, or troubleshoot
  broken symlinks after npm install. Also use when the user mentions nuxeo-elements
  not reflecting local changes, packages reverting to registry versions, or needing
  to co-develop nuxeo-ui-elements, nuxeo-elements, or nuxeo-dataviz-elements locally.
---

# Link Nuxeo Elements

Set up symlinks so Nuxeo Web UI uses a local `nuxeo-elements` checkout instead of
packages from the npm registry.

## What It Does

Replaces three `@nuxeo` packages in `node_modules` with symlinks to a sibling
`nuxeo-elements` repo:

| npm Package | Symlink Target |
|---|---|
| `@nuxeo/nuxeo-ui-elements` | `<nuxeo-elements>/ui` |
| `@nuxeo/nuxeo-dataviz-elements` | `<nuxeo-elements>/dataviz` |
| `@nuxeo/nuxeo-elements` | `<nuxeo-elements>/core` |

## Prerequisites

- The `nuxeo-elements` repo must be cloned as a sibling directory (or at a custom path)
- `npm install` must have been run first in `nuxeo-web-ui`

Expected directory structure:
```
Repositories/
  nuxeo-web-ui/           ← This project
  nuxeo-elements/         ← Sibling repo (default location)
    core/
    ui/
    dataviz/
```

## How to Link

### Default (sibling directory at `../nuxeo-elements`)

```bash
NUXEO_ELEMENTS_DIR="../nuxeo-elements"
rm -rf node_modules/@nuxeo/nuxeo-ui-elements && ln -s "../../../nuxeo-elements/ui" node_modules/@nuxeo/nuxeo-ui-elements
rm -rf node_modules/@nuxeo/nuxeo-dataviz-elements && ln -s "../../../nuxeo-elements/dataviz" node_modules/@nuxeo/nuxeo-dataviz-elements
rm -rf node_modules/@nuxeo/nuxeo-elements && ln -s "../../../nuxeo-elements/core" node_modules/@nuxeo/nuxeo-elements
```

### Custom path

If the `nuxeo-elements` repo is at a non-default location, use absolute paths:

```bash
NUXEO_ELEMENTS_DIR="/path/to/nuxeo-elements"
rm -rf node_modules/@nuxeo/nuxeo-ui-elements && ln -s "$NUXEO_ELEMENTS_DIR/ui" node_modules/@nuxeo/nuxeo-ui-elements
rm -rf node_modules/@nuxeo/nuxeo-dataviz-elements && ln -s "$NUXEO_ELEMENTS_DIR/dataviz" node_modules/@nuxeo/nuxeo-dataviz-elements
rm -rf node_modules/@nuxeo/nuxeo-elements && ln -s "$NUXEO_ELEMENTS_DIR/core" node_modules/@nuxeo/nuxeo-elements
```

### Verify symlinks are in place

```bash
ls -la node_modules/@nuxeo/
```

You should see symlinks (arrows `->`) for `nuxeo-elements`, `nuxeo-ui-elements`,
and `nuxeo-dataviz-elements` pointing to the local repo directories.

## Critical Warning: npm install Breaks Symlinks

Running `npm install` replaces the symlinks with registry packages. You must
re-create the symlinks after every install:

```bash
npm install
# Then re-run the symlink commands above
```

## Troubleshooting

### Symlinks not working after install

Re-run the `rm -rf` + `ln -s` commands from the "How to Link" section above.

### Sibling repo not found

Either:
1. Clone `nuxeo-elements` as a sibling: `cd .. && git clone <repo-url>`
2. Or use the "Custom path" approach with an absolute path

### Changes in nuxeo-elements not reflected

1. Check symlinks exist: `ls -la node_modules/@nuxeo/`
2. If they're regular directories (not symlinks), re-create the symlinks
3. Restart the dev server (`npm start`) — Webpack may need a fresh build
4. Check you're editing files in the correct nuxeo-elements subdirectory (`ui/`, `core/`, or `dataviz/`)

### Wrong branch in nuxeo-elements

Ensure both repos are on compatible branches:
```bash
# In nuxeo-web-ui
git branch --show-current

# In nuxeo-elements — should be on a matching/compatible branch
cd ../nuxeo-elements && git branch --show-current
```

## Symlink Mappings Detail

The three symlinks use relative paths from `node_modules/@nuxeo/`:

| Symlink Path | Relative Target |
|---|---|
| `node_modules/@nuxeo/nuxeo-ui-elements` | `../../../nuxeo-elements/ui` |
| `node_modules/@nuxeo/nuxeo-dataviz-elements` | `../../../nuxeo-elements/dataviz` |
| `node_modules/@nuxeo/nuxeo-elements` | `../../../nuxeo-elements/core` |

The `../../../` traverses: `@nuxeo/` → `node_modules/` → `nuxeo-web-ui/` → parent
directory where `nuxeo-elements` is a sibling.
