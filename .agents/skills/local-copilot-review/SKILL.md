---
name: local-copilot-review
description: >-
  Run a local, pre-PR code review that mirrors GitHub Copilot's automatic PR
  review, using the SAME rules Copilot uses (.github/copilot-instructions.md +
  AGENTS.md). Diffs the current branch against its PR base (lts-2025 or
  maintenance-3.1.x), then reviews the changes so you can fix issues BEFORE
  opening/updating the PR — so Copilot has nothing to comment on. Use before
  every push to a PR branch, or when the user says "review my changes like
  Copilot would", "avoid Copilot comments", or "check against copilot rules".
---

# Nuxeo Web UI — local Copilot-style review

GitHub Copilot code review runs **on GitHub's servers** when a PR is opened; it
cannot be installed locally. But it is guided by
`.github/copilot-instructions.md` (which defers to `AGENTS.md`). This skill
reproduces the *effect* locally: review the branch diff against those exact
rules **before** pushing, so the eventual Copilot review finds nothing.

## When to run

- Before `git push` on a PR feature branch (new PR or update).
- Whenever the user wants to pre-empt / avoid Copilot PR comments.

## Procedure

1. **Collect the diff** the PR will contain:

```bash
bash .cursor/skills/local-copilot-review/scripts/collect-diff.sh
# or force a base: ... collect-diff.sh origin/maintenance-3.1.x
```

   The script auto-picks the closest PR base (`origin/lts-2025` or
   `origin/maintenance-3.1.x`), prints the changed files, the committed
   `base...HEAD` diff, and any uncommitted working-tree changes.

2. **Load the rulebook** Copilot uses, in this priority order:
   - `.github/copilot-instructions.md`
   - `AGENTS.md` (authoritative — wins on conflicts)
   - The path-scoped rules in `.github/instructions/*.instructions.md` that match
     the changed files (e.g. `unit-tests`, `elements`, `document-layouts`,
     `search-layouts`, `i18n`, `themes`, `addons`, `build-config`).

3. **Review the diff against those rules.** Prefer delegating to the **Bugbot**
   subagent (`Diff: branch changes`) and pass the rulebook as Custom
   Instructions so the review is scoped to this repo's standards. If Bugbot is
   unavailable, review inline. Flag concretely (file + line + fix):
   - Polymer conventions: legacy `Polymer({…})` factory kept (not converted to
     class), behaviors not mixins, `.html` dom-module elements untouched in style.
   - **No raw `fetch()`** — server calls must use `<nuxeo-operation>` /
     `<nuxeo-resource>` / `<nuxeo-document>` / `<nuxeo-page-provider>`.
   - Style: `printWidth 120`, `singleQuote`, `trailingComma: all`, `semi`,
     `tabWidth 2`; no lines > 120 chars; no `.only` in tests.
   - Naming: `nuxeo-` kebab-case elements; layout/test file path conventions.
   - i18n: user-facing strings via `this.i18n('key')` / `[[i18n('key')]]`, keys
     added to `i18n/messages.json`.
   - Tests: new `*.test.js` registered (run `npm run update-test-load-all`);
     meaningful assertions; no leftover `.only`/`.skip`.
   - Correctness/regressions, dead code, missing null checks, obvious a11y gaps.

4. **Report** as a short list of findings grouped High / Medium / Nit, each with
   the exact file, line, and suggested fix. If clean, say so.

5. **Fix** the actionable findings (High/Medium at least), then re-run the
   lint+test gate before pushing:

```bash
bash .cursor/skills/nuxeo-web-ui-pr-checks/scripts/pr-checks.sh --fix
```

## Notes / limits

- This is a *best-effort local mirror*, not the identical Copilot model — treat
  it as a pre-filter, not a guarantee of zero comments.
- To actually **stop** Copilot from commenting (rather than pre-empt it), that's
  a GitHub-side setting: repo/org **Settings → Copilot → Code review**, or the
  ruleset that auto-requests `Copilot` as a reviewer. Requires admin on
  `nuxeo/nuxeo-web-ui`; it cannot be changed from the local checkout.
