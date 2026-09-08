---
name: dependabot-fix
description: End-to-end workflow for a Nuxeo Web UI (WEBUI-XXXX) or Nuxeo Elements (ELEMENTS-XXXX) Dependabot / dependency-security ticket. Accepts a Jira key, a whole epic of CVE tickets, a Dependabot alert number (#373), or a package name. It resolves the repo(s) in scope, checks that nobody is already on it and that an upstream patch exists, declares a scope contract so only the CVE package and packages structurally forced to move with it ever change, scans other manifests and other resolved instances of the same package, runs a deep impact analysis, fixes both LTS lines on branches that PR into the active security integration branch, validates locally and falls back through safer strategies if a gate fails, then creates the PRs and posts the Jira comment directly. Use when asked to "work on"/"fix" a Dependabot or dependency-upgrade ticket or epic, or when the user names WEBUI-XXXX/ELEMENTS-XXXX for a security bump, in either nuxeo-web-ui or nuxeo-elements.
---

# Dependabot fix workflow (Nuxeo Web UI / Nuxeo Elements)

Automates the full lifecycle of a dependency-security ticket, in either `nuxeo-web-ui` or `nuxeo-elements`, across both maintained LTS lines. Optimized for the real constraints of this workspace (learned from prior runs):

- **Commits must be Verified (signed).** Always create commits **locally** with `git commit` (this machine signs by default — SSH signing) and `git push`. **Never** create commits via the GitHub API/contents endpoint or web UI — those land Unverified. If push is blocked, hand the user the push commands and wait; do NOT fall back to an API commit to work around it.
- **Pushes may need authorizing.** Don't assume `git push` is pre-allowed. Run it as a standalone command (not `cd … && git push`). If it's denied, hand the user the exact push commands and wait — do not circumvent, and do not substitute an API commit.
- **Post PR descriptions and Jira comments directly — no approval gate.** The code/lockfile changes are already reviewed via the PR itself, so don't hold the descriptive text back for a separate sign-off. **But keep both current:** if the fix changes after the initial post (new commits, a scope-contract correction, a cross-manifest package folded in after Step 2's ask, etc.), immediately refresh **both** the PR description (`gh pr edit`) and the Jira comment (edit in place via its `commentId`, never stack a duplicate) so neither ever goes stale. Other outward actions that aren't part of this routine documentation — e.g. transitioning the Jira ticket's status, filing a brand-new ticket — still need your explicit go-ahead (see Step 6b).
- **A "safe" bump can still break production.** A past `@nuxeo/chart-elements` bump passed lint + unit tests and still shipped a broken charts feature. Impact analysis and a manual sanity checklist are mandatory deliverables, not optional.
- **Exact-scope guardrail.** Only the target package — and packages structurally forced to move with it (their declared range excludes the patch) — may change. Anything else is incidental and must be isolated or explicitly justified (Step 2 / Step 6). Never bump a sibling package "while you're at it."

## Cursor execution notes
- **Jira/Confluence** actions run through the Atlassian MCP server (cloudId `hyland.atlassian.net`) and post directly (see the no-approval-gate rule above). **Only if it isn't configured/authenticated** — a technical fallback, not the default — ask the user to paste the ticket details, and draft the Jira comment for them to post manually.
- **GitHub** actions (`gh api`, `gh pr …`) use the `gh` CLI from the integrated terminal (must be authenticated).
- **Impact analysis** (Step 3) is performed by the `dependabot-impact-analyst` Cursor skill — either delegate to it as a subagent or follow its method inline. This skill is fully self-contained; it does not depend on any `.claude/` files.
- **Helper scripts** live in `scripts/` next to this file — one source of truth for the lockfile queries so a hand-transcription slip can't silently pass a gate. All are **pure Node** (`node`, `git`, `npm` only — no bash), so they run identically on macOS, Linux, and Windows. Call them by path from the repo root:
  - `locate-instances.js <lockfile> <pkg>` — locate + who-declares (Step 2)
  - `scan-manifests.js <ticket-manifest-lockfile> <pkg>` — cross-manifest duplicate scan, nuxeo-web-ui (Step 2.4)
  - `cve-check.js <lockfile> <pkg> "<vulnerable-range>"` — CVE gate, exits non-zero on any in-range instance (Step 4.1)
  - `audit-diff.js <manifest-dir> <pkg>` — `npm audit` flagged-node before/after (Step 4.1)

  Each script's header documents its own contract and its logic is plain to read, so if a script can't be run you can reproduce it inline from that header. Note: the *inline shell snippets elsewhere in this skill* (the `gh api … --jq` calls, `git` sequences) assume a bash-compatible shell — native on macOS/Linux, and available via Git Bash or WSL on Windows.

## Repos this skill covers
| Fact | nuxeo-web-ui | nuxeo-elements |
| --- | --- | --- |
| GitHub repo | `nuxeo/nuxeo-web-ui` | `nuxeo/nuxeo-elements` |
| Jira project | `WEBUI` | `ELEMENTS` |
| LTS-2025 / LTS-2023 branches | `lts-2025` / `maintenance-3.1.x` (default) | `lts-2025` / `maintenance-3.1.x` (default) |
| Lockfile topology | root **+ 3 independent sibling projects**, each its own install | root **npm workspaces** (5 packages), **1 shared lockfile** |
| Ships as | deployed app | published `@nuxeo/*` npm packages, consumed by nuxeo-web-ui |

Full per-repo detail (lockfile topology, CI gate commands, branch naming, publish model, common pitfalls) lives in:
- `references/nuxeo-web-ui.md`
- `references/nuxeo-elements.md`

**Cross-repo scope — default to staying in-repo.** Work **only** the repo the ticket is in. The other repo (nuxeo-web-ui ↔ nuxeo-elements) is **out of scope and must be ignored** unless a real propagation dependency is proven by **both** of:
1. **It ships** — the change alters something the current repo *publishes* and the other *consumes*: a `@nuxeo/*` package's actual shipped code, or the dependency ranges declared in that package's own `package.json` that the other repo resolves against. A consumer-side `overrides`/lockfile pin **never ships**, so it cannot propagate (e.g. the ELEMENTS-2024 `brace-expansion` override has zero effect on nuxeo-web-ui).
2. **It affects the other repo** — the published change could actually break the other repo's build/runtime, or is required for it to close its own alert.

If either is false → treat the repos as fully independent. **Each repo owns its own Dependabot alerts;** the same CVE existing in the other repo is that repo's own ticket (found by its own Dependabot scan), NOT something to flag or spin off from this one. The **only** case that earns a cross-repo follow-up is the genuine shipped-dependency case: a CVE nested inside a `@nuxeo/*` package's *shipped* tree, published from nuxeo-elements and consumed transitively by nuxeo-web-ui — fix + publish in **nuxeo-elements**, then a **real follow-up** bump in nuxeo-web-ui once published (a security PR in nuxeo-elements alone does not close a `WEBUI-` side alert). A transitive dep both repos pull independently via a third-party package (like `brace-expansion` via the `nuxeo` client) is **not** this case. See the "Cross-repo" section in both reference files.

## Step 0 — Identify the repo(s) in scope
- Jira key prefix `WEBUI-` → nuxeo-web-ui; `ELEMENTS-` → nuxeo-elements. A Dependabot alert URL/number names its repo directly. A bare package name → check both repos' lockfiles (nuxeo-web-ui root + its 3 sibling projects; nuxeo-elements root) for a hit.
- If the package is used in **both** repos, or the vulnerable code is nested inside a `@nuxeo/*` package published from nuxeo-elements but the ticket was filed under `WEBUI-`, **stop and tell the user which repo(s) are actually affected** before doing anything — don't silently fix only one side.
- Load `references/nuxeo-web-ui.md` and/or `references/nuxeo-elements.md` for the resolved repo(s) and use their facts (Jira project, branch naming, CI commands) for the rest of this run.

## Step 0.5 — Epic or several tickets? (batch mode)
Engineers usually hand over a whole epic of CVE tickets rather than a single key. Trigger this step when the input is an **Epic key**, a JQL/filter, or more than one ticket/alert.

1. **Expand and confirm the list before touching anything.** `searchJiraIssuesUsingJql` with `parent = <EPIC> ORDER BY key` (fall back to `"Epic Link" = <EPIC>`). Show the resolved tickets (key, package, manifest, alert #, severity) and get a yes before starting.
2. **Global pre-pass — resolve every ticket before fixing any of them.** Run Step 1, Step 1.5 and Step 2.1 (locate only, no changes) for each ticket and build one table: ticket → repo → package → manifest(s) → other manifests/instances holding the same package. This is what makes a batch cheaper than N separate runs: the same-manifest and cross-manifest scans (Step 2.4) normally have to stop and ask about each extra hit, but in batch mode most hits turn out to be **another ticket in this same batch** — cross-reference that sibling ticket instead of interrupting. Only genuinely unclaimed hits still need an ask.
3. **Order the work from that table:**
   - Group by manifest, and within a manifest do **parents before children** — bumping a parent re-resolves its children and would churn an already-finished ticket's lockfile.
   - **Same-manifest collisions:** two tickets touching one lockfile will conflict when both PR into the same integration branch. Ask **once** at the start which the engineer wants, then apply it for the whole batch: **(a) sequential** — branch ticket B off A's branch and merge in order, keeping one ticket per PR; or **(b) combined** — one PR per manifest covering several tickets, with every Jira key in the title/body.
   - Different manifests and different repos never collide — run those independently.
4. **Then run Steps 1→6 per ticket, unchanged.** Default stays one branch pair + one PR pair per ticket so each keeps its own scope contract, impact analysis and review story. Never fold unrelated tickets into a mega-PR without the engineer choosing (b) above.
5. **Fix a shared package once.** If two tickets resolve to the same package *and* manifest (duplicate alerts), fix it under the first and, on the second, post a Jira comment pointing at that PR — don't ship two PRs for one change.
6. **Close with a batch summary:** a table of ticket → package → PR links → risk → sanity areas, plus an explicit **"not fixed"** section for anything blocked (no upstream patch per Step 1.5, awaiting an engineer decision, or absorbed by another ticket) so nothing silently drops out of the epic.

Use a TodoWrite list to track the remaining steps below (in batch mode, one entry per ticket plus the shared pre-pass).

## Step 1 — Resolve the ticket
Accept any of: Jira key, Dependabot alert number, or package name.
- **Jira key** → `getJiraIssue` (cloudId `hyland.atlassian.net`, `responseContentFormat: markdown`, include `comment`). Parse: package, advisory/CVE, vulnerable range, patched version, Dependabot alert number, affected manifest.
- **Alert number** → `gh api repos/nuxeo/<repo>/dependabot/alerts/<n>`. Then find the linked Jira issue: `searchJiraIssuesUsingJql` with `project = <WEBUI|ELEMENTS> AND (summary ~ "<pkg>" OR description ~ "<alert#>")`.
- **Package name** → `gh api "repos/nuxeo/<repo>/dependabot/alerts?state=open" --jq '.[] | select(.dependency.package.name=="<pkg>")'` (try both repos if the repo wasn't already resolved in Step 0).

Confirm the resolved target (repo, package, old→new version, alert #, Jira key) back to the user in one line before proceeding.

## Step 1.5 — Pre-flight: already claimed, or not fixable yet?
Two cheap checks, before any branching. Each one prevents a whole wasted run.

1. **Is a human already on it?** `gh pr list --repo nuxeo/<repo> --state open --search "<pkg>" --json number,title,author,baseRefName` and `git ls-remote --heads origin | rg -i '<pkg>|<TICKET>'`. A hit usually means the alert is claimed under another ticket (see also the cross-manifest scan) — report it and confirm before duplicating the work.
   **Ignore PRs authored by `app/dependabot`.** These repos always carry a dozen-plus open Dependabot PRs, and they are not a collision: Dependabot closes its own PR automatically once the dependency reaches the version it wanted on the branch it targets. Fix the ticket normally — Dependabot's PR retires itself once the integration branch merges up into the LTS branch it targets. Don't flag them, don't close them by hand, don't ask the engineer about them.
2. **Does a patched version actually exist?**
   ```
   gh api repos/nuxeo/<repo>/dependabot/alerts/<n> --jq '.security_vulnerability.first_patched_version'
   ```
   `null` means no fix has been released for this advisory. The advisory DB lags, so verify upstream before believing it: `npm view <pkg> versions --json` plus the project's releases/changelog, looking for any version outside the vulnerable range.
   - **A fix does exist upstream** → carry on normally with that version, and note in the PR/Jira that the alert metadata was stale. The version the ticket transcribed is itself a point-in-time snapshot — the definitive target is the full **live advisory set** for the package, resolved when you declare the scope contract (Step 2.2).
   - **Genuinely unpatched** → **do not invent a fix.** Never pin to a nonexistent version, never override to something unpublished, never quietly drop the dependent package to make the alert go away. Instead: run Step 2.1 (locate only — Step 3 needs its dev/runtime + dependent-chain data), then Step 3's impact analysis — reachability *is* the deliverable here — then stop before Step 4 and report (a) whether the vulnerable code path is even reachable in this repo (dev/build-only vs runtime), (b) mitigations worth considering if it is reachable and severe (replace or drop the dependent, pin to an older unaffected major, pre-plan a scoped override for when upstream ships), and (c) a recommendation: **accept-risk-and-wait** (the usual outcome for dev/build-only) or **escalate**. Post that as the Jira comment, open no PR, leave the ticket open, and state plainly that it needs a re-check once upstream publishes. In batch mode it goes to the "not fixed" section of the summary.

## Step 2 — Scope contract & minimal fix
On the primary LTS line first (repeat per branch in Step 4 — lockfiles differ across LTS lines):

1. **Locate it**: is it in `package.json` (direct) or transitive? Who requires it and with what range?
   ```
   node .cursor/skills/dependabot-fix/scripts/locate-instances.js <lockfile> <pkg>
   ```
   It prints one `... requires <pkg>@<range>` line per declaring manifest and one `... => <version>` line per resolved instance (with a `(dev)` suffix on dev-only instances — useful for the dev-vs-runtime call in Step 2/3), matching instances exactly (`node_modules/<pkg>` or `*/node_modules/<pkg>`) so a name that merely ends the same way (`@types/minimatch` vs `minimatch`) never leaks into your scope contract.
   For nuxeo-elements, also check which workspace's own `package.json` declares it (`core/package.json`, `ui/package.json`, `dataviz/package.json`, etc.) — you'll need this for targeted testing in Step 4.
2. **Declare the scope contract before changing anything.** From the query above, write down and show the user, as a short confirmation line:
   - Target package + patched version.
   - Any direct dependents whose declared range **excludes** the patched version — these are "structural" and *must* bump too for npm to resolve the patch. Name them explicitly.
   - Default: **"No other package is expected to change."** Only override this default when the query above proves a structural dependent exists.
   - **Fix to the full live advisory set for the target package — not just the version the ticket transcribed.** A ticket is a point-in-time snapshot and goes stale: new advisories on the same package are routinely published between triage and fix, and advisory/Dependabot ranges creep upward. (ELEMENTS-2024 named `brace-expansion` `2.1.3`+`5.0.7`, but by fix time `npm audit` surfaced GHSA-mh99-v99m-4gvg + GHSA-rgw5-rvv9-x895, pushing the needed versions to `2.1.4`+`5.0.9` plus a `1.x` top-level to `1.1.18` — shipping the ticket's literal versions would have been reopened by a newly-published advisory days later.) Before finalizing the contract, re-query the live set — `gh api "repos/nuxeo/<repo>/dependabot/alerts?state=open" --jq '.[] | select(.dependency.package.name=="<pkg>")'` plus `npm audit` — and pick the **smallest version per resolved major** that clears all of them. Guardrails, so this reads as "clear this one package" and never "bump everything":
     - Applies **only** to the ticket's target package (and its structural dependents) — it is NEVER license to bump unrelated sibling packages.
     - Keep it **scoped per major** (e.g. `<pkg>@1` / `@2` / `@5` overrides) so no instance crosses a major boundary its parent doesn't support.
     - If clearing the full live set needs versions or majors **beyond what the ticket named**, surface it to the user and get an explicit nod before applying — don't silently auto-expand. It stays within the target package, so it needs no brand-new ticket.
     - Still record any instance consciously left unfixed (e.g. no published patch yet) per the same-manifest / cross-manifest rules below.
3. **Pick the smallest change that reaches the patched version** (touching only packages named in the contract above):
   - Patched version satisfies the existing range → lockfile-only refresh: `npm update <pkg> --package-lock-only`.
   - Direct dependency, range must move → bump the range in `package.json`, then `npm install --package-lock-only`.
   - **Transitive and a parent's declared range forbids the patch** (the "structural dependent" from step 2 — e.g. parent `B` only accepts `<pkg>@^4`, but the fix needs `<pkg>@5.x`) → **prefer bumping `B` itself over forcing an override.** Check whether a newer release of `B` already declares a range that accepts the patched `<pkg>` version:
     ```
     npm view B versions --json                 # list candidate releases
     npm view B@<candidate> dependencies.<pkg>   # does this release's declared range cover the patched version?
     ```
     - **A compatible `B` release exists** → bump it like any other structural dependent: `npm install B@<compatible-version> --package-lock-only` (or move `B`'s range in `package.json` if it's direct). This is the safer fix — it's a combination `B`'s own maintainers tested and released, not one you're forcing. Name the exact `B` version bump in the scope contract and justify it ("bumped B x→y because y is the first release compatible with patched <pkg>@<version>").
     - **No compatible `B` release exists yet** → only then fall back to an `overrides` entry for `<pkg>` (nuxeo-web-ui's `package.json` already has a precedent block for this — see `references/nuxeo-web-ui.md`), then `npm install --package-lock-only`. Flag this clearly to the user: an override forces a `<pkg>`/`B` combination that `B`'s maintainers never tested or declared support for — treat it as a temporary workaround and note in the PR/Jira output that it should be revisited once `B` publishes a compatible release.
4. **Multiple manifests & cross-manifest duplicate scan:**
   - nuxeo-web-ui: the ticket may span the root **and** its independent sibling lockfiles (`packages/nuxeo-web-ui-ftest`, `packages/nuxeo-designer-catalog`, `plugin/a11y`). Run the update **in each manifest the ticket/alert actually names** (`cd <dir> && npm update <pkg> --package-lock-only`) and fix them all in one commit.
   - nuxeo-elements: one root lockfile serves all 5 workspaces — run the update once at the repo root. Use the workspace(s) identified in step 1 to scope Step 4's targeted tests.
   - **Same-manifest multi-instance scan (both repos, every run):** a single lockfile routinely resolves **several copies** of one package at different majors (e.g. `plugin/a11y` carries both a `brace-expansion@1.x` and a `2.x` instance), and Dependabot alerts on each vulnerable line **separately**. Fixing the line your ticket names leaves the other untouched — and invisible, since the Step 4.1 CVE check only tests your ticket's range. Enumerate them before finalizing the contract:
     ```
     node .cursor/skills/dependabot-fix/scripts/locate-instances.js <lockfile> <pkg>
     ```
     (the `... => <version>` lines are the resolved instances; a `(dev)` suffix marks dev-only ones.) For every instance **outside** this ticket's vulnerable range, check whether it carries its own alert — `gh api "repos/nuxeo/<repo>/dependabot/alerts?state=open" --jq '.[] | select(.dependency.package.name=="<pkg>") | {number, range: .security_vulnerability.vulnerable_version_range, manifest: .dependency.manifest_path}'` — and compare that range against the instance's version. Then handle it exactly like a cross-manifest hit: **its own open alert → cross-reference it, don't fix it here**; **no alert and clear of every vulnerable range → just record it**; **no alert but it does fall in a vulnerable range → stop and ask the engineer.** Always state the outcome ("3 resolved instances: the 2.x line fixed here, 1.x tracked under alert #391").
   - **Cross-manifest duplicate scan (nuxeo-web-ui only, every run — not just bare-package-name input):** these 4 manifests are fully independent, so Dependabot scans and alerts on each separately. A ticket naming only `plugin/a11y` says nothing about whether `<pkg>` is *also* vulnerable in `packages/nuxeo-web-ui-ftest`. Before finalizing the contract, check the other 3 manifests too:
     ```
     node .cursor/skills/dependabot-fix/scripts/scan-manifests.js <ticket-manifest-lockfile> <pkg>
     ```
     It derives the manifest list from `git ls-files` internally (never hardcoded, so a newly added sub-project is never silently skipped), skips `node_modules` and the ticket's own manifest, and lists **every** matching instance per manifest, not the first — a lockfile commonly holds a safe top-level copy *and* a vulnerable nested one, so stopping at the first hit can report "clear" while a vulnerable instance sits below it. The `<ticket-manifest-lockfile>` must be the path exactly as `.dependency.manifest_path` reports it (no `./` prefix — a mismatch just re-flags your own manifest as a duplicate).

     For each additional hit, confirm it actually falls in the vulnerable range (reuse the semver check from Step 4.1), then decide **per hit, never silently**:
     - **A separate open Dependabot alert already exists for that manifest** (`gh api "repos/nuxeo/nuxeo-web-ui/dependabot/alerts?state=open" --jq '.[] | select(.dependency.package.name=="<pkg>" and (.dependency.manifest_path=="<other-manifest>"))'`) → treat it as independently tracked (possibly already assigned to another engineer). **Do not fix it in this PR** — only cross-reference it (alert #, and its Jira ticket if `searchJiraIssuesUsingJql` finds one) in the PR body and Jira comment, so nobody duplicates or collides with that work.
     - **No separate alert exists there** (genuinely untracked) → still don't auto-fix. **Stop and ask the engineer** whether to fold it into this PR (as an explicitly justified additional package, per the scope-contract rule above) or leave it for a new ticket. Proceed only once they answer.
     - **Nothing else found** → state that plainly too ("cross-manifest scan: no other nuxeo-web-ui manifest affected") — this must always appear in the PR/Jira output, never be silently skipped.
5. **Enforce the scope contract** (must catch non-registry drift, not just tarball bumps): inspect the **full** diff of every changed lockfile — do NOT rely only on `"resolved":` registry URLs, which miss local changes. Compare it line-by-line against the contract from step 2 — anything that changed but wasn't named there is a violation and needs a decision:
   - `git diff <file> | grep -E '^[-+]' | grep -iE 'SNAPSHOT|"version"|<any dep unrelated to target>'`
   - **Watch for workspace-mirror re-syncs:** nuxeo-web-ui's sub-project lockfiles (`plugin/a11y`, `packages/*`) embed a *mirror* of any local `file:`-linked package's manifest (its `version` + dependency ranges). If that mirror was stale, `npm update` silently re-syncs it — surfacing unrelated SNAPSHOT bumps, dependency-range changes, and removed deps decided in other tickets. This is dev-only metadata but **out of scope** for a security PR.
   - If a violation appears, **surface it to the user and offer two paths** (don't decide silently):
     - **(a) Isolate** — restore those specific lines to their base-branch values (`git diff <base> -- <file>`) so the PR contains only the contract's package set. Cleanest scope for a security PR.
     - **(b) Keep + document** — leave the changes and document them (Step 6) inline on the exact changed lines, tagged as either **structural** (cite the conflicting range from step 2) or **incidental** (cite the upstream cause, e.g. `git log -S<symbol>` to find which ticket changed it, and confirm it's a stale-mirror re-sync).
   - Never `--amend`/`reset`/force-push if history-rewrite is blocked here. To isolate after a push, add a follow-up revert commit; to switch back to keep, `git revert` that commit. Squash-merge collapses the extra commits — normal push, no force needed.

## Step 3 — Impact analysis (delegate)
Run the **`dependabot-impact-analyst`** Cursor skill (`.cursor/skills/dependabot-impact-analyst/SKILL.md`) — delegate to it as a subagent if available, otherwise follow its method inline — passing: **repo** (`nuxeo-web-ui` | `nuxeo-elements`), package, old→new, dev/runtime + dependents, advisory. It reads `.cursor/skills/dependabot-impact-analyst/references/feature-test-map.md`, runs a bundle-reachability check appropriate to the repo, and returns a structured report: type, semver delta, risk, what changed, where used, **targeted test files/scripts to run**, a manual sanity checklist, and whether automated gates would catch a regression. Keep its report verbatim for the PR body and Jira comment. Do not shortcut this even for "obvious" dev-only bumps — the evidenced "no product impact" conclusion is itself a deliverable. If the report links a package to a feature missing from the map, add a row to it.

## Step 4 — Apply to both branches

### 4.0 — Resolve the integration branch (discover, don't assume)
The security staging-branch name **rotates** (e.g. `security-fixes-2025` today, potentially `security-fixes-q3-2025` → `security-fixes-q4-...` later) and applies identically to **both** repos — this is a workspace-wide convention, not a per-repo fact. For each LTS line, on the target repo:
1. `git fetch origin --prune`, then list live candidates: `git ls-remote --heads origin 'security-fixes*'` (or `gh api repos/nuxeo/<repo>/branches --jq '.[].name' | rg security-fixes`).
2. **Exactly one match** for the line → that's the intended base, but **confirm it before branching**, don't just adopt it. Tell the engineer what you found and what you're about to do, in one line — e.g. *"Found `security-fixes-lts-2025` and `security-fixes-lts-2023`; I'll raise the two PRs against these. Continue, or give me different base branches?"* — and wait for the answer. A rotation may be mid-flight, or this ticket may belong on a different base for reasons the branch list can't show. Discovery narrows the choice; it doesn't make it.
3. **Multiple matches** (naming rotation in flight) → ask the engineer which is currently active. Never guess.
4. **No match** → ask the engineer whether to create one (default name `security-fixes-lts-<year>` off the main LTS branch — confirm the exact name they want) or — only as the **lowest-priority fallback** — PR directly against the main LTS branch. Get an explicit answer either way before proceeding.

### 4.1 — Branch, fix, validate, commit
For each `(integration branch, suffix)` pair resolved above:
1. Update the base: `git checkout <integration>`, `git merge --ff-only origin/<integration>`. If it can't fast-forward (diverged/ahead), stop and ask — don't force. Just before pushing, `git fetch` and rebase onto the latest base if it moved (check first the new commits don't touch the same lockfiles).
2. `git checkout -b <TICKET>-<slug>-<suffix> <integration>` — branch naming per `references/<repo>.md`.
3. Apply the fix. **Prefer re-running the Step 2 update on this branch** (lockfiles differ between LTS lines, so a cherry-picked lockfile diff usually conflicts). Use `git cherry-pick` only when the fix is a plain source edit that is byte-identical on both lines.
4. **Local validation gate — run the CI workflows locally before raising PRs; do not blindly defer to CI.** Re-verify the diff still matches the Step 2 contract, then:
   - **CVE-resolution check** (prove the fix on the branch, no Dependabot needed) — confirm the vulnerable version is gone from the resolved tree, reading only the lockfile. The `cve-check.js` helper takes the lockfile path as an argument, so run it **once per changed lockfile** from the repo root (where `semver` is installed) — pass the actual path, never a hardcoded one:
     ```
     node .cursor/skills/dependabot-fix/scripts/cve-check.js <lockfile> <pkg> "<vulnerable-range>"
     ```
     Checks **every** resolved instance, not just the top-level, and **exits non-zero** if any is still in range. Must exit 0 for each changed lockfile before you commit. Needs the root `node_modules` for `require("semver")`, so run it after the `npm ci` the build/test steps use. Paste the "N resolved instances, all clear" line (per lockfile) into the PR body + Jira comment.
   - **Advisory-database cross-check (compare flagged *nodes*, before vs after)** — the CVE check compares against a range **you transcribed by hand** from the alert, so a slip (`<2.0.2` when the advisory says `2.0.0 - 2.1.2`) gives a false green, and it only tests this ticket's advisory. `npm audit` queries the same GitHub Advisory Database that backs Dependabot — authoritative ranges, every advisory for the package. The `audit-diff.js` helper captures the flagged-instance list on the base and again after the fix:
     ```
     node .cursor/skills/dependabot-fix/scripts/audit-diff.js <manifest-dir> <pkg>
     ```
     **Run it BEFORE Step 5's commit** — it stashes the *uncommitted* lockfile change to get the "before", so on a clean (already-committed) tree the stash would be a no-op and the diff would falsely report "no change". The script refuses to run on a clean tree to make that impossible; if it errors out that way, you've already committed — reset the commit or diff against the base ref by hand instead. **Heads-up:** the stash uses no pathspec, so it temporarily stashes **all** tracked changes repo-wide (deliberate, to get a truly clean "before"), then restores them when the audit finishes — so commit or stash any unrelated in-progress edits on this branch first, or they'll ride along for the duration of the audit.
     **Gate on the node list, never on "is the package still flagged".** A package-level gate is unachievable here — the nuxeo-web-ui root currently reports 25 flagged packages and nuxeo-elements 140, and one package's advisory range routinely spans instances belonging to other alerts (`brace-expansion` at the web-ui root is flagged across 14 nodes at once). Requiring the package to vanish from audit would block every ticket. What must hold:
     - **For the target package, green means clear of its whole live advisory set — not just the range this ticket transcribed.** Every instance flagged by *any* live advisory on the target must be either removed from `audit-after` or explicitly documented as tracked elsewhere (per the same-manifest / cross-manifest rules); a leftover in another live range for the target is a fail, not a pass. This is exactly what the Step 2.2 live-set re-query enforces — see the ELEMENTS-2024 brace-expansion case. The tightening is for the **target package only**; the node-list gating below for OTHER packages is unchanged.
     - Every instance **your alert names** is gone from `audit-after`.
     - Every instance still listed is one you consciously left — the sibling instances documented under another alert by the same-manifest scan. Record them; they are expected, not a failure.
     - An instance you did **not** expect is still listed, or the semver script passed while audit still flags your target instance → **trust audit** and return to Step 2; your transcribed range was wrong or a second advisory covers it.

     Needs network, and takes ~30s on the larger lockfiles. Quote the before/after node diff in the PR body + Jira comment alongside the semver result.
   - **Manifest-coverage assertion** — confirm the lockfiles you actually changed cover **every** alert being closed: compare `git diff --name-only <integration-branch>...HEAD` against each alert's `.dependency.manifest_path`. Fixing the root while the alert points at `plugin/a11y/package-lock.json` produces two green checks and closes nothing.
   - **Lint** — always, using the repo's own command from `references/<repo>.md`.
   - **Build** — nuxeo-web-ui only (`npm run build`, webpack). nuxeo-elements has no bundler/build step — skip.
   - **Unit tests** — driven by the impact report:
     - No manual/UI testing required (dev/build-only, low risk) → run the **full** unit suite (repo's `npm test`/`npm run test-ci`).
     - High-risk runtime area → at minimum the targeted tests from the impact report (`npx web-test-runner --grep '<suite-name>'` for nuxeo-web-ui — filters the `test/load-all-tests.js` barrel so `test/setup.js` globals load; do **not** run `--files test/<name>.test.js` alone; `npm run test:<workspace>` for nuxeo-elements), plus the full suite if time permits.
     - **nuxeo-web-ui only — sibling-symlink false failure:** the `npm ci` you just ran for the CVE check **replaces** the local `@nuxeo/*` symlinks, so `npm test` can then fail importing `@nuxeo/nuxeo-ui-elements/...`. That is not a bump regression — re-link per the "Local dev symlink gotcha" in `references/nuxeo-web-ui.md` and re-run before treating it as real.
   - **Sub-project manifests have no local gate of their own — don't invent one.** nuxeo-web-ui's `packages/nuxeo-web-ui-ftest` and `packages/nuxeo-designer-catalog` declare only a `postinstall` (`check-engine`) script, and `plugin/a11y`'s only script is a WebdriverIO run against a **live Nuxeo server**. There is no lint, unit-test or build to run in those directories. So even when the fix is entirely inside one of those lockfiles, the local gate is: **root lint + root unit tests + root build, plus the CVE-resolution check against each changed lockfile.** The a11y and ftest suites are server-gated and covered by CI (a11y via Maven) — state that in the PR body rather than implying you validated a sub-project you couldn't run.
   - Record the actual results (pass/fail) for the PR body + Jira comment. Only proceed to commit/PR once everything passes locally — if something fails, go to 4.2 rather than pushing anyway.
5. Commit **only the changed manifest/lock files** (`git add package-lock.json [package.json]`) with:
   ```
   <TICKET>: <summary> (<CVE/advisory>)

   <one paragraph: what/why, dev-vs-runtime, dependent chain>
   ```
   Beware untracked local files (`.claude/`, `.cursor/`, docs) — never `git add -A`; stage explicit paths only.

### 4.2 — When a local gate fails
A red gate is a **stop**, not a formality to route around. Never reach green by weakening the check: no skipping/`.only`/deleting tests, no relaxing lint rules, no `--force` / `--legacy-peer-deps` to shove a resolution through, no "CI will sort it out".

1. **First, is it even yours?** Re-run the same gate on the untouched base (`git stash` or a clean checkout of `<integration>`). Still failing there → pre-existing or flaky (`test/nuxeo-document-tree` is a known flaky one — re-run once before concluding). Two known false positives to rule out *before* blaming the bump: the flaky test above, and (nuxeo-web-ui) a wiped `@nuxeo/*` sibling symlink after `npm ci` making imports fail — re-link per `references/nuxeo-web-ui.md` and re-run. Note any genuine pre-existing failure in the PR body and carry on; don't repair unrelated breakage inside a security PR.
2. **Caused by the bump → walk this ladder**, re-running the failed gate after each rung, stopping at the first green:
   1. **Smaller semver delta** — is there a lower version that still exits the vulnerable range? (`npm view <pkg> versions --json` against the advisory range.) Prefer `1.2.4` over `2.0.0` when both are clear of it.
   2. **Narrow the blast radius** — swap a global bump/override for a **scoped** override under just the offending parent (`"<parent>": { "<pkg>": "<version>" }`, per the precedent block in `references/nuxeo-web-ui.md`) so unaffected consumers keep the version they were tested against.
   3. **Bump the parent instead** (Step 2.3) — when the failure is a peer/API mismatch, a newer parent release built against the patched version resolves it far more cleanly than forcing versions together.
   4. **Adapt our own code** — only if the break is a genuine, small API change on our side, it sits inside what the ticket implies, and the impact analysis supports it. Anything bigger is a separate ticket, not a refactor smuggled into a CVE PR.
3. **Record what you tried.** When a later rung passes, fill the PR body's **Alternatives tried** line so a reviewer understands why the fix has an unusual shape.
4. **Nothing on the ladder passes → don't open the PR.** Abandon the branch (`git checkout <integration> && git branch -D <feature-branch>`) or leave it local, and report instead: the failing gate with its output, the step-1 proof that the bump caused it, every strategy tried and how each failed, and the options — wait for an upstream release, take the upgrade as its own scoped work ticket, or accept the risk with justification. Post that as the Jira comment (same post-directly rule) and let the engineer choose. A blocked ticket reported honestly beats a green PR hiding a broken gate.

## Step 5 — Push (blocked here) + PRs (create directly)
1. Attempt `git push -u origin <feature-branch>` for both lines. If denied by managed settings, print both push commands and **wait for the user to confirm they pushed**. Do not retry in a loop.
2. After push confirmed, `git fetch` and verify both branches exist on origin.
3. **PR Title Format (mandatory):** `<TICKET>: <summary> [LTS-<year>]` — e.g., `WEBUI-2120: Security Fix: esbuild (0.28.0 → 0.28.1) [LTS-2025]` or `ELEMENTS-2024: Security Fix: brace-expansion [LTS-2023]` (drop the `(old → new)` arrow when a ticket spans several versions/majors). Use a **real** ticket key from the security-fix stream — never invent one.
4. Create each PR immediately with `gh pr create --base <integration-branch-from-4.0> --head <feature-branch> --title "..." --body ...` — no separate approval step for the body text (per the no-approval-gate rule above). PRs target the resolved integration branch (or the LTS branch directly only if the engineer chose that fallback in 4.0), never a guessed name.
   - If a PR already exists (auto-created on push), `gh pr edit <n> --title ... --body ...` instead of failing. This means a PR **from your own feature branch** — distinct from the `app/dependabot` PRs Step 1.5 says to ignore, which are separate PRs on Dependabot's own branches and retire themselves; never edit or close those.
5. Capture both PR URLs.
6. **If anything changes later** (a follow-up commit, a cross-manifest package added after asking the engineer, a corrected scope contract), re-run `gh pr edit <n> --body ...` with the refreshed template on **every** affected PR right away — don't let the description drift from what's actually in the branch.

PR body template:
```
# Security Fix: <pkg>

## Summary
This PR addresses Dependabot security alert(s) for <pkg> <vulnerability-type> in <repo>.

## Resolves Dependabot Security Alerts
- [Security Alert #<n1>](https://github.com/nuxeo/<repo>/security/dependabot/<n1>) - <manifest-path-1>
- [Security Alert #<n2>](https://github.com/nuxeo/<repo>/security/dependabot/<n2>) - <manifest-path-2> (if applicable)

> These alerts stay **open** after this PR merges. Dependabot only re-scans branches it tracks, so they dismiss once `<integration-branch>` is merged up into `<lts-branch>` — not when this PR lands. The proof the fix works is the CVE-resolution check below.

**CVE:** <CVE-ID or "Not assigned">
**GHSA:** <GHSA-ID or "Not assigned">
**Severity:** <critical|high|medium|low>

## Vulnerability Details
<one-paragraph description of the vulnerability, what it affects, and the risk>

## Fix Strategy
- **Type:** <lockfile-only|direct-dependency|override>
- **Updated to:** <new-version-range>
- **Files changed:**
  - <manifest-file-1>
  - <lockfile-file-1>
- **Other packages changed and why:** <for each package outside the target — "structural (bumped): <parent> x→y, its range <old-range> excluded patched <pkg>@<version>, y is the first compatible release" or "structural (override): forced <pkg>@<version> via overrides — no <parent> release accepts it yet, revisit once one ships" or "incidental: <cause>, see inline comment" — or "None — only <pkg> changed.">
- **Cross-manifest scan (nuxeo-web-ui only):** <"No other nuxeo-web-ui manifest affected" | "Also found in <manifest>, tracked separately under Security Alert #<n> (<Jira key if found>) — not fixed here to avoid duplicate/conflicting work" | "Also found in <manifest>, untracked — included here with <engineer>'s approval">
- **Same-manifest instances:** <"1 resolved instance — fixed" | "<n> resolved instances: <version-line> fixed here; <other-version-line> is clear of every vulnerable range" | "<n> resolved instances: <version-line> fixed here; <other-version-line> tracked separately under Security Alert #<n> (<Jira key if found>) — not touched here">
- **Alternatives tried:** <only when the first strategy failed a local gate — "direct <pkg>@<v> bump failed `npm run build` (<error>); scoped override under <parent> passes all gates" — otherwise omit this line>

## Version Compatibility
**Upgrade path:** <old-version> → <new-version> (<patch|minor|major> version bump)

**Research findings:**
- Reviewed <package-name> release notes / security advisory
- **Breaking changes:** <none|description>
- **Backward compatible:** <yes|no|partial>

**Safety assessment:** ✅ **Safe to merge**
<brief safety justification>

## Local Validation Results
**CVE Resolution (two independent sources):**
- Lockfile scan: <one line per changed lockfile — "<lockfile-path> — <pkg>: <n> resolved instance(s), all clear of vulnerable range <vulnerable-range>">
- `npm audit` flagged-instance diff: <"<pkg>: <n> instance(s) flagged before → <m> after; removed: <nodes>; still flagged (tracked under Alert #<n>, out of scope here): <nodes or 'none'>">
- Manifest coverage: <"changed lockfiles cover every alert's manifest_path: <paths>">

**Testing:**
- Lint: ✅ Pass
- Build: ✅ Pass (nuxeo-web-ui only) | n/a (nuxeo-elements, no build step)
- Unit tests: ✅ Pass (<scope: full suite|targeted files/scripts>)
- <only when a sub-project lockfile changed: "packages/nuxeo-web-ui-ftest | packages/nuxeo-designer-catalog | plugin/a11y has no lint/unit/build script — validated via the CVE-resolution check above; its WebdriverIO suite is server-gated and runs in CI.">
- <only if a gate failed on the base branch too: "Pre-existing failure, unrelated to this change: <gate> — also fails on <integration-branch>.">


## Manual Testing Steps
**Affected Features (from feature-test-map):**
- <feature-1>: <test-location>

**Testing Checklist:**
<paste the impact-analyst sanity checklist here>

## Cross-repo follow-up
<only when the ship-and-affects test is met (a CVE inside a shipped `@nuxeo/*` tree published from nuxeo-elements and consumed by nuxeo-web-ui): "Once this is published (SNAPSHOT/promoted), open a follow-up in nuxeo-web-ui to bump @nuxeo/<pkg> to <version>" — otherwise "n/a — independent repos, other repo out of scope">

---
Jira: https://hyland.atlassian.net/browse/<TICKET>
```

## Step 6 — Document (inline PR comments + Jira)

### 6a. Inline PR comments for every non-target package that changed
Whether **structural** (contract-required, Step 2.2) or **incidental** (Step 2.5), annotate it **inline on the changed lines** so reviewers/Copilot see the explanation exactly where the diff is. Inline is the default and always the first attempt; a main-thread comment is acceptable only as the documented fallback when GitHub refuses the anchor (see below). Recipe per PR:
```
gh api -X POST /repos/nuxeo/<repo>/pulls/<PR>/comments \
  -f body="<for structural-bump: 'Bumped <parent> <old>→<new> — its declared range <old-range> excluded the patched <pkg>@<version>; <new> is the first <parent> release that accepts it.' for structural-override: 'Added an override forcing <pkg>@<version> — <parent>'s range <range> excludes it and no compatible <parent> release exists yet; revisit once one ships.' for incidental: explanation + upstream ticket cite + dev/test-only + no functional impact; tag @copilot>" \
  -f commit_id="<PR head SHA: git rev-parse origin/<feature-branch>>" \
  -f path="<file>" \
  -F line=<a genuinely CHANGED line, side RIGHT> -f side="RIGHT"
```
**Get the anchor from the diff, don't estimate it.** `line` must be the absolute line number in the file's **new** version, not a hunk offset — mixing those up is the usual cause of `422 line must be part of the diff`. Read it off the hunk header:
```
git diff -U0 <integration-branch>...HEAD -- <file> | rg '^@@'
```
In `@@ -a,b +c,d @@`, the right-hand `c` is the first changed line on the RIGHT side; anchor on `c` (or any line in `c … c+d-1`). Recompute per branch — the same change sits at different line numbers on the two LTS lines. `commit_id` must be the current head SHA (`git rev-parse origin/<feature-branch>`); if you push again afterwards, re-check the comment didn't go stale.

**If the API still rejects it, fall back — never drop the explanation.** Large `package-lock.json` diffs can exceed GitHub's rendering limits, and a file collapsed as "too large to display" may accept no inline anchor at all. In that case post a **main-thread** PR comment that names the file, quotes the exact changed lines, and notes it couldn't be anchored inline. An unexplained extra package in a security PR is far worse than an explanation in a slightly less convenient place. Only delete a main-thread note once you have successfully replaced it with an inline one (`gh api -X DELETE /repos/nuxeo/<repo>/issues/comments/<id>`).

### 6b. Jira comment (post directly)
Post a comprehensive comment via `addCommentToJiraIssue` immediately — no approval step (cloudId `hyland.atlassian.net`). If anything changes later (new commits, an added cross-manifest fix, a corrected contract), **edit the same comment in place via its `commentId`** rather than stacking a new one, so Jira always reflects the current state of both PRs. Mirror the PR body template's sections. **Never** append an AI-authorship or tool-attribution footer/marker (e.g. a "Generated with …" line) to Jira comments or PR descriptions — they must contain no such attribution.

**Comment format — GitHub-flavored Markdown ONLY, then verify the render (mandatory gate).** Always pass `contentFormat: "markdown"` and author the body in plain **Markdown**: `###` headings, `**bold**`, `|`-pipe tables, `*`/`-` bullets, `[text](url)` links, fenced ```` ``` ```` code. **Never use Jira wiki markup** — `h3.`/`h2.` headings, `{code}`/`{panel}`/`{noformat}` macros, `*wiki-bold*`, `#`/`##`-style numbered wiki lists. The tool converts Markdown → ADF, so any wiki-markup token lands as **literal text** (e.g. a line that reads `h3. Testing verdict` instead of a real heading) — this is exactly the failure to avoid. After every post **and** every in-place edit, **verify the render**, don't trust the echoed input: re-fetch with `getJiraIssue` (`fields: ["comment"]`, `responseContentFormat: "adf"`) and confirm each section title came through as an ADF `"type": "heading"` node and every matrix/detail table as a `"type": "table"` node — **not** as literal `###`/`h3.`/`|` text sitting inside a `paragraph`. If any heading or table is literal text, the body used the wrong syntax: re-post it in proper Markdown and re-verify. Do not consider Step 6b done until this check passes.

**Always render every PR (and every Dependabot alert) as an inline link, never as bare text or a plain number** — e.g. `[PR #1594](https://github.com/nuxeo/<repo>/pull/1594)`, not `PR #1594` or `#1594`. This applies to the Jira comment and to every GitHub PR body / inline comment. A reader must be able to click straight through to each PR and alert.

**Critical — bare `#<n>` auto-links to the WRONG thing on GitHub.** In any GitHub PR/issue body or comment, GitHub silently turns a bare `#<n>` into a link to **issue/PR #<n>** in that repo. **Dependabot alert numbers are a completely separate numbering space from issue/PR numbers**, so a bare `#171` meant as "alert 171" renders as a link to whatever unrelated PR happens to be #171 (e.g. it showed up as "ELEMENTS-1077: add _getBoundElements helper #171"). This is silent and easy to miss. Rules:
  - **Every** `#<n>` in a GitHub body — in headings, list items, tables, AND inline prose (not just the "Resolves alerts" list) — must be a full Markdown link: a Dependabot alert as `[Security Alert #<n>](https://github.com/nuxeo/<repo>/security/dependabot/<n>)`, a PR as `[PR #<n>](https://github.com/nuxeo/<repo>/pull/<n>)`. Never leave a bare `#<n>` anywhere, even on second/third mention.
  - This is the one difference from Jira, where a bare `#<n>` doesn't link at all (it just shows as inert text) — but still use full links there so it's clickable.
  - **Verify after posting/editing** (same gate as the Markdown-format check): fetch the live body (`gh pr view <n> --json body --jq '.body'`) and confirm no bare `#<digits>` survives outside a `[...](...)` link — anchor the check on alert numbers especially, since those are the ones that collide.

**Key content for Jira:**
- **Applied to both LTS lines:** integration branch names actually used (from Step 4.0) for each line + PR URLs.
- **Other packages changed and why** — same list as the PR body; never omit even if empty ("none").
- **Cross-manifest scan (nuxeo-web-ui only)** — same result as the PR body; if another manifest is affected but tracked under a separate alert, name that alert/Jira key explicitly so the two tickets can be cross-referenced instead of duplicated.
- **Same-manifest instances** — same result as the PR body. If another major-version line of the package sits in the same lockfile under its own alert, name it, so nobody reads "fixed" as "all instances of this package are now safe".
- **Sanity-test checklist** — explicit action items, with the reminder that lint/unit passing does not guarantee runtime correctness (reference the prior charts regression when high-risk).
- **Local validation proof** — a **facts-only evidence log**: both CVE sources (lockfile scan + `npm audit` advisory cross-check), the manifest-coverage assertion, and lint/build/test results. Since the alert itself can't confirm the fix until the merge-up (see below), these are the evidence that it works. It lists **only checks actually run** (all "done") — do NOT put pending items here; those live solely in the Testing verdict to avoid drift. Close this section with one breadcrumb line that **states the actual outcome (never a vague "if any")** so a reader never mistakes it for the whole picture: when engineer steps remain, `→ ⏳ Engineer validation required — see the Pending items in the Testing verdict below.`; when none remain, `→ No engineer validation pending — full status in the Testing verdict below.`
- **Alert closure expectation** — say plainly that the Dependabot alert (and any Dependabot PR for the same package) stays **open** after these PRs merge, because Dependabot only re-scans the branches it tracks — the alert dismisses once the integration branch is merged up into `lts-2025` / `maintenance-3.1.x`, which is outside this ticket's control. Without this line, security tracking and QA read the still-open alert as "not fixed" and the ticket gets reopened. Point them at the CVE-resolution check as the actual proof, and name who owns the integration-branch merge if known.
- **Cross-repo follow-up** — emit only when the ship-and-affects test is met (a CVE inside a shipped `@nuxeo/*` tree published from nuxeo-elements and consumed by nuxeo-web-ui): state whether a companion `WEBUI-` ticket/PR is still needed once this publishes, or link it if it already exists. Otherwise the other repo is out of scope — state "n/a — independent repos, other repo out of scope" (e.g. the ELEMENTS-2024 `brace-expansion` override, which never ships) and spin off nothing.
- **If the fix changed the ticket's scope** (e.g. the Step 2.2 live-set re-query surfaced newer same-package advisories, so versions/advisory list/acceptance criteria now differ from the ticket text): editing the *description* is beyond routine comment posting, so it still needs the user's explicit go-ahead — but when authorized, **edit it cleanly IN PLACE.** Correct the scope figures (versions, advisory/alert list, acceptance criteria) **directly** so it reads like a normal, correctly-scoped ticket. Do **not** prepend a dated "CORRECTION (updated <date>) / previous scope vs new scope / original kept for history" narration — that just clutters the ticket. The blow-by-blow (advisory history, why-scoped-per-major, PR links, validation proof) belongs in the analysis **comment**, not the description. (ELEMENTS-2024's description was first messed up with a dated correction preamble, then cleaned to a plain corrected scope.)
- **Testing verdict (ALWAYS the LAST/closing section of the comment — never the middle or top):** the reader reaches it after all the evidence, as the "so what does QA/the reviewer do now" conclusion. Prefix the heading with a 🔴 marker (e.g. `### 🔴 Testing verdict`) to make it stand out — the Jira markdown comment format has no colored-text support, so the emoji is the stand-in for a red heading. Render it as **a matrix table** so the split between **DONE (automated / AI-runnable)** and **PENDING (owned by an engineer/QA)** is visible at a glance — never bury a required-but-not-yet-done step in prose. Columns: **Check | Why it's relevant here | Runnable by | Status**. One row per relevant check, then a closing pending line:
  - **Rows to include:** every gate you ran (lint; unit suite + scope; build/`lerna run analysis`/Storybook where relevant; CVE lockfile scan + `npm audit` diff), plus every check that is *relevant but not locally run* — the shipped/runtime sanity (UI regression, manual QA/functional) and any publish/release path. In the **Why** column, tie each to the actual package (e.g. "exercises `nanoid` via `@web/test-runner`", "`ip-address`/`undici` reached only via lerna's publish stack"). In **Runnable by** put `AI / CI`, `CI release job on merge`, or `Engineer`. In **Status** use `✅ Done`, `⏳ Auto (deferred to CI)`, `❌ Not required — <reason>`, or `⏳ Pending`.
  - **Always answer the shipped-code questions explicitly, even when the answer is "no":** *UI regression required?* and *Manual QA/functional required?* For a **shipped/runtime-reachable** package say **required** and point at the specific feature(s)/test location(s) from the impact-analyst report (feature-test-map) — those become `⏳ Pending` rows owned by `Engineer`. For a **dev/build/test/docs-tooling** package with no runtime-reachable or shipped instance say **`❌ Not required`** with the reason (not a declared dependency of any published workspace, does not ship in the `@nuxeo/*` bundles, so no product/UI code path a bump could affect).
  - **Close with an explicit pending line:** `**⏳ Pending — engineer/QA to perform: <checklist | none>.**` — the "what's left for an engineer" list (each item = a required step that could NOT be done automatically: needs a running Nuxeo server, visual/UX check, functional flow, WebdriverIO/a11y/ftest against a live instance, etc.). **If nothing is pending, say so explicitly** (e.g. *"none — everything testable locally is done; the publish path is auto-covered by CI's release job on merge"*) so a reader never has to guess whether an outstanding step was forgotten vs genuinely unnecessary.
  - Do **not** mention whether new automated tests were added — a lockfile-only bump has no product code to test, so that line is noise. **Only** use the no-further-testing (nothing pending) verdict for confirmed dev/build-only changes; a dependency reachable from shipped **runtime** code keeps the full manual sanity checklist as `⏳ Pending` rows and gets no such waiver.

Do not transition the ticket status unless the user explicitly asks.

## Finish
Summarize: repo(s), fix applied, branches used (from Step 4.0), PR links, risk level, top sanity areas, whether a downstream companion ticket is needed (**only** when the ship-and-affects test is met; otherwise the other repo is out of scope — independent repos own their own alerts), and — always — that the alert stays open until the integration branch merges up into the LTS branch, so nobody reads the open alert as a failed fix. In batch mode, give the Step 0.5 summary table plus the **"not fixed"** section (blocked on upstream, awaiting a decision, or covered by a sibling ticket) — an epic must never end with a ticket silently unaccounted for. Update the TodoWrite list to complete.
