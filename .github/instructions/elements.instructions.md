---
applyTo: "elements/**/*.js,elements/**/*.html"
---

# Polymer Web Components

This directory contains all Polymer 3 web components for Nuxeo Web UI.

## Element Patterns

- Use the **legacy Polymer factory** pattern: `Polymer({ is: '...', _template: html\`...\` })`
- Do NOT convert to LitElement or class-based Polymer unless explicitly asked
- Shared logic uses **behaviors** (not mixins): `FiltersBehavior`, `FormatBehavior`, `RoutingBehavior`, `I18nBehavior`
- Server communication MUST use Nuxeo Elements (`<nuxeo-operation>`, `<nuxeo-resource>`, `<nuxeo-document>`, `<nuxeo-page-provider>`), never raw `fetch()`
- Some elements are `.html` files with `<dom-module>` + inline `<script>` — this is intentional, not legacy cruft

## Naming

- Custom elements: kebab-case with `nuxeo-` prefix
- Document layouts: `document/<doctype>/nuxeo-<doctype>-<mode>-layout.html` where mode = view|edit|metadata|create
- Search layouts: `search/<name>/nuxeo-<name>-search-form.html`

## i18n

- Use `this.i18n('key')` in JS or `[[i18n('key')]]` in templates
- Add new keys to `i18n/messages.json`

## Style

- Prettier: 120 chars, single quotes, trailing commas, semicolons
- `Polymer` is a readonly global, `Nuxeo` is writable
- Do not use `?.`, `??`, `catch { }` or other post-ES2019 syntax — the Designer catalog generator (`polymer-analyzer` 3.2.4) cannot parse it and drops the file and the elements it defines from the catalog (ESLint enforces this). Use `a && a.b` (truthiness only), `a != null ? a.b : undefined` (value used), an explicit `!= null` check instead of `??`, or `catch (e)`.
