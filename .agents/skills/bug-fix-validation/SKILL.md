---
name: bug-fix-validation
description: >-
  Test Engineer 3 playbook that validates a delivered UI bug fix in nuxeo-web-ui
  end-to-end and autonomously: analyse the Jira ticket (WEBUI-<id>/ELEMENTS-<id>)
  and its PRs, derive intelligent acceptance criteria rather than copying the
  ticket, prepare environments, run the buggy base branch and the fixed branch
  side by side on separate ports, reproduce the bug, verify the fix, and test the
  four mandatory areas — translations, RTL support, different browsers and
  accessibility — plus functional, corner-case, blast-radius and regression
  scenarios, collecting evidence (screenshots, videos, HAR, console, logs) into a
  structured Evidence/ tree and publishing an audit-ready validation report with a
  Pass/Fail/Blocked recommendation. Use when asked to "validate a bug fix",
  "verify WEBUI-<id> is fixed", "QA sign-off", "test this PR", "regression test
  the fix", or "bug fix validation report".
---

# Validate a Nuxeo Web UI bug fix — Test Engineer 3, agentic end-to-end

Act as **Test Engineer 3 (TE3)**: an experienced QA engineer who understands the defect, validates the
implementation, verifies regressions, compares branches, gathers evidence, and publishes a complete
testing report.

Run in **YOLO mode: execute the whole workflow end-to-end without pausing for confirmation between
phases.** State the plan up front for the record, then keep going. Track phases with a TODO list.

> **Never stop at the first failure.** Diagnose it, retry recoverable errors with exponential backoff,
> document blockers, and continue validating every remaining scenario. A phase that cannot complete is
> recorded as `Blocked` with the reason — it does not end the run.

> **Evidence is always captured in BOTH forms — screenshots (images) AND screen recordings (videos),
> for the buggy branch AND the fixed branch.** Never ask which format; always produce both.

## Scope — what this skill does and does not test

**This is UI validation.** Everything is verified through the Web UI in a browser.

| In scope | Out of scope |
|---|---|
| UI behaviour, layout, styling, themes | Backend/server-side logic |
| **Translations** (mandatory area) | REST/Automation API contract testing |
| **RTL support** (mandatory area) | Database / schema / data-layer testing |
| **Different browsers** (mandatory area) | Server performance and load testing |
| **Accessibility** (mandatory area) | Writing or running automated test suites |
| Functional, corner-case, regression, blast radius | Generating Playwright/Cypress/unit/API test assets |

> **No automated tests.** This skill neither generates nor recommends automated test assets, and it
> does not run the repo's unit or functional suites. Validation is hands-on UI verification driven by
> the capture harness. If the diff clearly needs test coverage, mention it in one line under
> *Observations* — do not produce test code.

> **Backend behaviour is context, not a test target.** Read server responses only to explain a UI
> symptom (e.g. "the list is empty because the request 404s"). Do not design API, database or
> permission-model test cases.

> **Validate, don't fix.** This skill inspects, tests and reports. It does not edit product code,
> commit, or push. If validation finds the fix incomplete or a regression, report it and hand off to
> [`fix-nuxeo-web-ui-bug`](../fix-nuxeo-web-ui-bug/SKILL.md).

> ### ⛔ NON-NEGOTIABLE OUTPUT RULE — Jira comments are Markdown, never wiki markup
> Every Jira comment goes through `addCommentToJiraIssue` with `contentFormat:"markdown"`, so the body
> **must be GitHub-flavoured Markdown**: `###` headings, `**bold**`, `-`/`1.` lists, triple-backtick
> fenced code blocks. **NEVER** use Jira wiki syntax (`h3.`, `{code}…{code}`, `*bold*`, `# ordered`) —
> it renders literally and looks broken on a customer ticket. If you catch wiki markup after posting,
> re-send `addCommentToJiraIssue` with the **same `commentId`** to fix it in place.

Useful constants:
- Atlassian cloudId: `252cce86-035e-4b0e-abd2-3c002935632f` (site `hyland.atlassian.net`)
- Upstream repo: `nuxeo/nuxeo-web-ui` · bases: `lts-2025` and `maintenance-3.1.x`
- Validation workspace root: `~/Desktop/jira-evidence/<TICKET-ID>/validation/`
- Code worktree root: `~/Desktop/Projects/WebUI/worktrees/<TICKET-ID>/<role>/`

### Filesystem layout — evidence and code live in separate roots
| What | Where |
|---|---|
| Evidence, harness, logs, reports | `~/Desktop/jira-evidence/<TICKET-ID>/validation/` |
| Code worktrees (the `target` and `fixed` checkouts) | `~/Desktop/Projects/WebUI/worktrees/<TICKET-ID>/<role>/` |

> **Never create a folder directly on `~/Desktop`.** `validation/` sits beside the `fix/` and
> `reproduce/` folders written by the `fix-nuxeo-web-ui-bug` and `reproduce-nuxeo-web-ui-bug` skills,
> so every phase of a ticket collects under one `~/Desktop/jira-evidence/<TICKET-ID>/` folder.
>
> **Never create a worktree directly in `~/Desktop/Projects/WebUI/`** — that holds the primary clones,
> and loose worktrees there accumulate silently at ~1 GB each. `dual-branch-up.sh` already places them
> correctly and its `--remove` action deletes the ticket's worktree folder while keeping the evidence.
> Override the roots with `NX_VAL_ROOT` / `NX_WT_ROOT` if you need to.

## Companion skills

| Need | Skill |
|---|---|
| The bug is not fixed / a regression is found | [`fix-nuxeo-web-ui-bug`](../fix-nuxeo-web-ui-bug/SKILL.md) |
| Reproduce only, no fix to validate yet | `reproduce-nuxeo-web-ui-bug` (personal skill) |
| Review the diff the way Copilot will | `local-copilot-review` (personal skill) |
| File the QA sprint sub-task | [`jira/create-qa-subtask`](../jira/create-qa-subtask/SKILL.md) |

## Reference material (read when the phase needs it)

- [`environment.md`](environment.md) — runtime detection matrix, throwaway Nuxeo containers, dual-branch
  dual-port setup, build/deploy gotchas, retry policy.
- [`test-design.md`](test-design.md) — how to derive acceptance criteria, the UI functional and
  corner-case catalogs, the four mandatory areas in depth, blast-radius heuristics, regression checklist.
- [`evidence.md`](evidence.md) — Evidence tree, capture harness API (locale, RTL, browser, a11y probes),
  video verification, known capture gotchas.
- [`report-template.md`](report-template.md) — the final validation report, section by section.

## Tooling — prefer MCP tools over shelling out

- **`user-Atlassian-MCP-Server`** — `getJiraIssue` (`fields:["*all"]`), `getJiraIssueRemoteIssueLinks`,
  `addCommentToJiraIssue`. No attachment tool → binary uploads go through Jira REST (Phase 16).
- **`user-github`** / `gh` CLI — PRs, files changed, reviews. `gh` is usually faster.
- **`user-docker`** — `list_containers` (check bound ports **before** picking one — never disturb a live
  container), `run_container`, `fetch_container_logs`, `stop_container`, `remove_container`. It has no
  `exec`/`cp` tool, so those stay on the `docker` CLI.
- **`user-playwright`** — exploratory clicking and screenshots: `browser_navigate`, `browser_snapshot`
  (accessibility tree — resolves shadow DOM the flat DOM can't, and doubles as an a11y check),
  `browser_click`, `browser_fill_form`, `browser_evaluate`, `browser_console_messages`.
- **`user-context7`** — version-accurate third-party docs (Nuxeo, Puppeteer, WCAG references).

## Setup check — first-time users

Verify before the first run on a machine; if something is missing, point the user at
[`.cursor/skills/README.md`](../README.md) "One-time setup" rather than silently continuing:
Atlassian MCP authenticated (`atlassianUserInfo` succeeds; else `mcp_auth`) · `~/.jira_email` +
`~/.jira_token` present for attachments · `gh auth status` logged in · Node ≥ 18 (`nvm use 22`) and
`npm ci` done · Docker Desktop installed (`docker info` succeeds, or `open -a Docker`).

---

## Phase 0 — Plan (non-blocking)

Restate the goal, list Phases 1–17 as a TODO list, and start the **execution log**:

```bash
bash .cursor/skills/bug-fix-validation/scripts/validation-init.sh <TICKET-ID> --with-firefox
. ~/Desktop/jira-evidence/<TICKET-ID>/validation/env.sh
```

This creates the `Evidence/` tree, the capture harness (`puppeteer` + `puppeteer-screen-recorder`),
`run.log`, and exports `NX_VAL_*`. `--with-firefox` adds the second browser engine Phase 9 needs
(~2 min the first time, cached afterwards); drop it only if the cross-browser pass is being skipped. **Every command, environment detail and decision from here on gets
appended to `run.log`** (`nxval_log "…"`) so the run is reproducible. Show the plan, then proceed.

## Phase 1 — Jira analysis

`getJiraIssue` (cloudId above, `issueIdOrKey=<TICKET-ID>`, `fields:["*all"]`, `contentFormat:"markdown"`).
Collect and understand: summary · description · expected vs actual behaviour · severity · priority ·
labels · components · environment · `issuelinks` · parent story · epic · attachments (screenshots,
videos) · **every comment**, separating developer comments, QA comments and any stated root cause.

`fixVersions` decides the branches: a `3.1.x` version → `maintenance-3.1.x`; an LTS/2025 version →
`lts-2025`. Both → validate both. Empty/ambiguous → default to `lts-2025` and say so.

An `ELEMENTS-<id>` link usually means the real fix lands in **nuxeo-elements** (shared widgets) — pull
that ticket and its PR too.

> **Treat the ticket as evidence, not as the specification.** Read any acceptance criteria written on
> the ticket as *one input*. The criteria you validate against are derived in Phase 3.

Produce three short write-ups (they feed the report): **functional understanding** (what the user sees),
**technical understanding** (which code path), **reproduction understanding** (exact preconditions and
steps).

## Phase 2 — Understand the UI fix

Locate every PR: the ticket's dev panel, `getJiraIssueRemoteIssueLinks`, and search both repos:

```bash
gh pr list --repo nuxeo/nuxeo-web-ui   --search "<TICKET-ID>" --state all \
  --json number,title,baseRefName,headRefName,state,mergedAt,mergeCommit
gh pr list --repo nuxeo/nuxeo-elements --search "<TICKET-ID>" --state all --json number,title,baseRefName,state
gh pr diff <pr> --repo nuxeo/nuxeo-web-ui                        # the actual change
gh pr view <pr> --repo nuxeo/nuxeo-web-ui --json files,commits,reviews
```

Expect a **matched pair** (one PR per base). A fix on only one base is a finding — report it.

Analyse the diff for its **UI surface**: elements and layouts changed · templates and bindings ·
styles, theming and CSS custom properties · icons and images · i18n keys added, renamed or removed ·
direction-sensitive CSS (`left`/`right`, `margin-left`, `float`, `transform`) · focus, `tabindex`,
`aria-*` and roles · browser-specific APIs or CSS.

Produce: **fix summary** (root cause → change → why it is safe), **UI impact**, and an initial
**blast radius** (Phase 10 expands it).

If the `local-copilot-review` skill is installed, run the diff through it so Phase 14 starts from the
same rules the PR reviewer applies. Otherwise review against `.github/copilot-instructions.md` and
`AGENTS.md` directly.

## Phase 3 — Derive the acceptance criteria (intelligent, not copied)

**Write the acceptance criteria yourself.** Do not lift them from the Jira ticket — ticket criteria are
frequently vague ("dropdown should work"), incomplete (silent about RTL, locales, keyboard) or stale.
Derive observable, testable criteria from four sources, then reconcile them:

1. **The defect** — the specific broken behaviour must be gone, in the exact conditions that triggered it.
2. **The diff** — every branch the change introduced must be exercised: each new state, each condition,
   each style variant. If the fix adds a guard, there is a criterion for both sides of the guard.
3. **The product norms** — how equivalent Web UI components already behave (find a sibling element that
   does the same thing correctly, and hold the fix to that bar).
4. **The four mandatory areas** — translations, RTL, browsers, accessibility always contribute criteria,
   whether or not the ticket mentions them.

Each criterion must be **observable in the UI** and phrased so it can only pass or fail:

```
AC-01  Given <precondition>, when <action>, the UI shows <exact observable result>.
```

Record them in `Evidence/Reports/acceptance-criteria.md`, each tagged with its source
(`defect` / `diff` / `norms` / `mandatory-area`). Where a derived criterion contradicts or extends the
ticket, say so explicitly in the report — that gap is itself a finding. See
[`test-design.md`](test-design.md) for the derivation recipe and worked examples.

## Phase 4 — Environment preparation

Detect what the change needs, then set it up — see [`environment.md`](environment.md) for the full
matrix and recipes. For this repo the default is **npm** (Node ≥ 18) to build the UI and **Docker** for
a throwaway Nuxeo server to serve it.

```bash
git -C "$NX_VAL_REPO" fetch origin --prune
nvm use 22 && npm ci          # only if node_modules is stale/missing
```

Restore the `@nuxeo` symlinks if a previous `npm install` replaced them (see `AGENTS.md`), and scope
`NUXEO_PACKAGES` to the addon under test. Retry recoverable failures (network, registry, container pull)
with exponential backoff — 5s, 15s, 45s — then record a blocker.

## Phase 5 — Multi-branch setup (buggy vs fixed, side by side)

Identify the two refs:
- **Target branch** — where the bug exists: the base (`lts-2025` / `maintenance-3.1.x`) at the commit
  *before* the fix, or simply the base if the fix is not merged yet.
- **Source branch** — the fix: the PR head branch, or the merge commit on the base.

Bring both up simultaneously on isolated ports and runtimes:

```bash
bash .cursor/skills/bug-fix-validation/scripts/dual-branch-up.sh <TICKET-ID> \
  --target lts-2025 --fixed fix-WEBUI-<id>-<summary>-lts-2025
# already merged? compare the base against itself one commit earlier:
#   --target lts-2025~1 --fixed lts-2025
# only have a PR number?   --target lts-2025 --fixed-pr 3259
```

The script allocates two free host ports (e.g. `8100` / `8101`), starts one throwaway Nuxeo container per
branch (`nx-val-<ticket>-target`, `nx-val-<ticket>-fixed`), builds each branch in its own git worktree
with its own `node_modules`, deploys each `dist/` into the container, and fixes the `base-url` gotcha. It
writes the URLs into `env.sh` as `NX_VAL_TARGET_URL` / `NX_VAL_FIXED_URL`.

Both sides run the **same dev build pipeline**, so the only difference is the fix — that is what makes
the Phase 7 comparison trustworthy. Never touch a pre-existing/live container.

## Phase 6 — Verify bug reproduction (target branch)

Run the Phase 1 reproduction steps against `NX_VAL_TARGET_URL` and capture into `Evidence/Before/`:
screenshots, video, browser console, and the server log if it explains the symptom
(`docker logs nx-val-<ticket>-target`). Use the harness in [`evidence.md`](evidence.md).

**Prove the bug with a DOM probe, not just pixels** — a subtle defect can look identical in a static
shot. Log the probe result (attribute, computed style, accessible name, `dir`, error text) alongside the
screenshot.

If the bug does **not** reproduce, that is a finding, not a failure: document what you observed, check
whether the environment differs from the ticket (version, packages, Studio config, seed data, user
role), and continue to Phase 7 — the fix can still be validated against the Phase 3 criteria.

## Phase 7 — Verify the fix (fixed branch)

Run the **identical** steps against `NX_VAL_FIXED_URL`, capturing into `Evidence/After/` with the same
shot names in the same order. Verify: the defect is gone · every Phase 3 acceptance criterion passes ·
nothing unexpected appears (new console errors, layout shift, flicker, slower first render).

Compare the two runs automatically and highlight the differences:

```bash
bash .cursor/skills/bug-fix-validation/scripts/compare-shots.sh \
  "$NX_VAL_EVIDENCE/Before/<label>.png" "$NX_VAL_EVIDENCE/After/<label>.png" \
  "$NX_VAL_EVIDENCE/Reports/<label>-diff.png"
```

Also diff the console logs (`Console/before.log` vs `after.log`) — a fix that hides a symptom while
still throwing is not a fix.

## Phase 8 — Test case generation (UI)

Generate the suite from the defect, the diff and the Phase 3 criteria, using the catalogs in
[`test-design.md`](test-design.md): positive and negative paths, boundary conditions, workflow paths
through the affected screens, permission-driven UI states (read-only, hidden actions), responsive
layout, theming, and the **corner cases** (empty/null values, very long and Unicode names, special
characters, large lists, rapid clicks, stale views, navigation mid-render, session expiry as seen by
the UI).

Write them to `Evidence/Reports/test-cases.md` with stable IDs (`TC-01`, `TC-02`, …) **before**
executing, so the execution table maps 1:1. Each test case references the acceptance criterion it
covers. Keep the suite proportional to the change — targeted cases beat volume.

## Phase 9 — Mandatory areas: translations, RTL, browsers, accessibility

**These four areas are validated on every run**, whether or not the ticket mentions them. Full
procedures, selectors and pass criteria are in [`test-design.md`](test-design.md); the harness helpers
are in [`evidence.md`](evidence.md).

- **Translations** — the UI language comes from `navigator.language` at bootstrap. Run the affected
  screens in at least English, a long-word locale (`de` or `fr`) and a CJK locale (`ja` or `zh-CN`).
  Confirm every new/changed i18n key exists in **all 16 locale files** under `i18n/`, that no raw key
  leaks into the UI (`s.rawI18nKeys()`), and that longer translations do not truncate, wrap badly or
  overflow their control.
- **RTL support** — `index.js` sets `document.documentElement.dir = 'rtl'` for `ar`, `he`, `fa`, `ur`.
  Run the affected screens with `locale: 'ar'` and confirm the layout mirrors correctly: alignment,
  padding and margins, drawer and icon side, directional icons (chevrons, back arrows), text truncation,
  and no horizontal overflow. Direction-sensitive CSS in the diff is the highest-risk input here.
- **Different browsers** — Chrome is the baseline. Repeat the core scenario in **Firefox** via the
  harness, and in **Safari** manually on macOS (Puppeteer cannot drive it). Capture a screenshot per
  browser. Note that video and HAR are Chrome-only.
- **Accessibility** — keyboard reachability and a sensible focus order, visible focus indicator, no
  keyboard trap, accessible names on new controls, correct roles, and colour contrast on new or restyled
  elements. Run `s.a11yProbe()` for the mechanical checks and verify keyboard operation by hand.

Every area gets its own screenshots and an explicit Pass/Fail/N-A with a reason in the report — "not
applicable" must be justified, never assumed.

## Phase 10 — Blast radius analysis

Inspect what shares the changed code: elements and behaviors that import it · layouts that render the
changed widget · screens using the changed i18n keys · shared styles and theme variables · addons ·
both base branches. [`test-design.md`](test-design.md) has the `rg` recipes.

Produce: affected-screens list, **risk matrix** (screen × likelihood × impact), a regression checklist,
and suggested additional validation. Never claim "isolated" without having searched for usages.

## Phase 11 — Regression testing

Execute the regression checklist on the fixed branch, prioritised by the Phase 10 risk matrix:
navigation · login/logout · document browse and tree · create, edit, delete · search · upload and
download · versioning and history · preview · workflow and task screens · permission screens ·
metadata layouts · bulk actions · collections and favorites · admin screens · home and dashboards ·
themes. Record every scenario with a status, including the skipped ones and why.

## Phase 12 — Evidence collection

Everything lands under `~/Desktop/jira-evidence/<TICKET-ID>/validation/Evidence/`:

```
Evidence/
  Before/    After/    Videos/    Logs/    Console/    Network/    Traces/    Reports/
```

Capture screenshots, videos, browser console output, terminal output, and per-locale/per-browser shots.
If a capture capability is missing, **configure it and continue** — the harness installs its own Chrome
and bundles ffmpeg, so no system ffmpeg is required. See [`evidence.md`](evidence.md).

Verify recordings before trusting them (dump frames with the bundled ffmpeg); a silently no-op'd step
shows up in the frames.

## Phase 13 — Root cause validation

Confirm the implementation fixes the **root cause**, not the symptom. Trace the ticket's failure path
through the changed code and ask: does the guard sit where the bad state originates, or only where it
surfaces? Do other screens reach the same bad state by another path (search them)? Review the design,
potential side effects, hidden regressions and future risks.

State the verdict explicitly: **root cause fixed** / **symptom masked** / **partially fixed** — with the
code path that justifies it.

## Phase 14 — Code quality review

Review the diff for readability · architecture (cross-cutting client logic belongs in a Polymer behavior
under `elements/behaviors/`, not inlined into large elements) · naming · rendering performance · error
handling · backward compatibility · technical debt, plus the repo conventions from `AGENTS.md` (legacy
Polymer factory, Nuxeo Elements for server calls, 120-char lines, i18n keys, no logic in templates).
Provide concrete recommendations, each marked blocking or non-blocking.

## Phase 15 — Continuous validation loop

Loop **build → deploy → run → validate → capture → analyse** until every acceptance criterion passes,
the four mandatory areas are covered, regression passes, no blockers remain, and evidence is complete.
On each iteration: re-deploy only what changed, re-run the failing scenarios plus their neighbours, and
append the outcome to `run.log`. Retry transient failures (container not ready, network) with
exponential backoff before declaring a failure real.

Exit the loop when the success criteria below are met, or when the remaining items are genuinely blocked
— then report the blockers explicitly.

## Phase 16 — Publish the report

Write the full report to `Evidence/Reports/validation-report.md` using
[`report-template.md`](report-template.md), print the executive summary and the recommendation in chat,
then publish to Jira:

1. `addCommentToJiraIssue` (cloudId above, `contentFormat:"markdown"`) with the report — trim the
   evidence index to filenames plus the local path.
2. Upload the evidence via Jira REST (MCP has no attachment tool). **Never claim a file is attached
   until the upload returned OK.**

```bash
cd "$NX_VAL_EVIDENCE"
U="$(cat ~/.jira_email):$(cat ~/.jira_token)"
for f in Reports/validation-report.md Before/*.png After/*.png Videos/*.mp4; do
  curl -s -u "$U" -H "X-Atlassian-Token: no-check" -F "file=@$f" \
    https://hyland.atlassian.net/rest/api/3/issue/<TICKET-ID>/attachments \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('OK',d[0]['filename']) if isinstance(d,list) and d else print('FAIL',d)"
done
```

> **Dry-run exception.** If the user is *testing this skill* rather than genuinely validating the
> ticket, do not comment on or attach to the live Jira issue — say you are skipping the post and why,
> and put the report in chat only.
>
> **Comment visibility gotcha.** Do not set `commentVisibility` with `type:"group"` on this site —
> group visibility is disabled and the call fails with `GROUP_VISIBILITY_SETTING_NOT_ENABLED`.

New defects found during validation go in the report's **Defects Found** section. File them as separate
Jira bugs only when the user asks — customer-facing tickets should not collect speculative noise.

## Phase 17 — Clean up

Tear down only what this run created:

```bash
bash .cursor/skills/bug-fix-validation/scripts/dual-branch-up.sh <TICKET-ID> --remove
```

Leave `~/Desktop/jira-evidence/<TICKET-ID>/validation/` in place so the evidence stays available —
`dual-branch-up.sh --remove` removes the containers and the ticket's worktree folder but never the
evidence. Confirm via `list_containers` that no pre-existing container was touched, and via
`git -C <repo> worktree list | grep <TICKET-ID>` that no worktree is left behind. Report the final
state: recommendation, blockers, and anything left running on purpose.

---

## Autonomous behaviour

- Decide without asking whenever the context is sufficient; only escalate for missing credentials,
  inaccessible infrastructure, or genuinely ambiguous requirements.
- Retry transient errors with exponential backoff (5s → 15s → 45s), then record a blocker and move on.
- Detect and install missing dependencies safely (harness packages, browser binaries); never install
  globally or modify git config.
- Append every action, command and environment detail to `run.log` — the run must be reproducible.
- **Label every claim**: `Verified` (observed with evidence), `Inferred` (derived from code/diff), or
  `Assumed` (no direct check). Never present an inference as an observation.

## Success criteria

The run is successful only when it has: understood the defect and its implementation · derived its own
acceptance criteria · prepared the environments automatically · reproduced the original bug (or
documented why it does not reproduce) · verified the fix on every relevant branch · covered
translations, RTL, browsers and accessibility · completed functional, corner-case, blast-radius and
regression testing · collected complete evidence · published an audit-ready report with a clear
recommendation.

## Guardrails

- **Never edit product code, commit, push, or open PRs.** Hand off to `fix-nuxeo-web-ui-bug` instead.
- **Never generate automated test assets** or run the repo's test suites — this is hands-on UI validation.
- Never disturb a pre-existing/live container; always allocate free ports for throwaway containers.
- Never change global git config; never commit credentials or evidence into the repo.
- Never mark a test `Pass` without evidence, and never claim an attachment landed before the upload
  returned OK.
- YOLO relaxes *confirmation gates only* — not destructive operations or secret handling.
