---
applyTo: "themes/**"
---

# Themes

## Structure

```
themes/
  base.js          → Shared styles module (`nuxeo-styles` dom-module), imported by all elements
  loader.js        → Theme bootstrapper (reads localStorage, loads theme.html via link import)
  default/         → Default theme
    theme.html     → CSS custom properties in <custom-style>
    logo.png       → App logo
    preview.jpg    → Theme preview thumbnail
    README.md      → Theme description
  dark/            → Dark theme (same structure)
```

## Theme File (`theme.html`)

Each theme defines CSS custom properties inside a `<custom-style>` block:

```html
<custom-style>
  <style is="custom-style">
    html {
      --nuxeo-app-font: 'Inter', Arial, sans-serif;
      --nuxeo-primary-color: #0066ff;
      --nuxeo-secondary-color: #1f28bf;
      --nuxeo-page-background: #f5f5f5;
      /* ... */
    }
  </style>
</custom-style>
```

### Key Custom Properties

| Property | Controls |
|---|---|
| `--nuxeo-primary-color` | Primary accent color |
| `--nuxeo-secondary-color` | Secondary accent |
| `--nuxeo-page-background` | Page background |
| `--nuxeo-app-header` / `--nuxeo-app-header-background` | Top header bar |
| `--nuxeo-sidebar-background` / `--nuxeo-sidebar-menu` | Left sidebar |
| `--nuxeo-drawer-background` / `--nuxeo-drawer-text` | Slide-out drawer |
| `--nuxeo-text-default` | Default text color |
| `--nuxeo-border` | Standard border color |
| `--nuxeo-tag-*` | Tag/chip styling |
| `--nuxeo-button-*` | Button variants |

## Base Styles (`base.js`)

`themes/base.js` registers the `nuxeo-styles` shared style module as a `<dom-module>`. Elements include it via:

```html
<style include="nuxeo-styles">
```

This provides layout utilities, button styles, and common CSS rules used across all components.

## Theme Loading (`loader.js`)

- Reads `localStorage.getItem('theme')` to determine active theme
- Falls back to `default` if the stored theme is deprecated or not found (404 check)
- Injects a `<link rel="import">` for the selected `themes/<name>/theme.html`
- Users switch themes from their profile settings at runtime

## Rules

- Always use CSS custom properties (e.g., `var(--nuxeo-primary-color)`) — never hardcode colors
- Test changes against the supported built-in themes (default, dark)
- Keep the same custom property interface across themes — all themes must define the same set of variables
- New custom properties should be added to all theme files simultaneously
- `base.js` changes affect every component — modify with care
