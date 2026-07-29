---
name: fix-nuxeo-web-ui-bug
description: >-
  End-to-end agentic playbook for fixing a Jira bug (WEBUI-<id>, or an
  ELEMENTS-<id>/other ticket whose fix lands in nuxeo-web-ui) in the
  nuxeo-web-ui repo: runs fully autonomously end-to-end (YOLO mode, no
  confirmation gates), analyse the ticket + all comments, reproduce
  and capture evidence (images AND videos) to ~/Desktop/<TICKET-ID>/ first, then branch from both
  lts-2025 and maintenance-3.1.x, fix without inducing regressions, run the PR gating
  checks, create signed-commit PRs on both bases, watch CI and fix/rerun
  failures, then evaluate the Ready-for-QA checklist. Every phase ends with an
  executable exit gate, and a final verification sweep re-checks attachments,
  ticket comments, PR links and CI against the live Jira/GitHub state, looping
  until all of them pass. Use when asked to fix a WEBUI-/Jira bug, "commit and
  raise PR", or take a nuxeo-web-ui ticket to Ready for QA.
---

# Fix a Nuxeo Web UI bug — agentic, end-to-end

Drive the whole fix in **YOLO mode: run the entire workflow end-to-end without pausing for
confirmation between phases** — reproduce → fix → validate → commit → push → open PRs → update the
ticket → summarize → verify. State the plan up front for the record, then keep going. The only hard stops are
the safety **Guardrails** at the bottom (never force-push protected branches, never silently change
global git config); YOLO relaxes the *confirmation* gates, not those. Use a TODO list to track
phases. Delegate PR mechanics to the [`nuxeo-web-ui-pr`](../nuxeo-web-ui-pr/SKILL.md) skill and local
gating to the [`nuxeo-web-ui-pr-checks`](../nuxeo-web-ui-pr-checks/SKILL.md) skill.

> **Evidence is always captured in BOTH forms — screenshots (images) AND screen recordings (videos),
> before and after.** Never ask which format; always produce both.

> **Core rule — every fix ships on BOTH bases.** For *every* fix, always create a new branch
> from **`lts-2025`** *and* a new branch from **`maintenance-3.1.x`** (the maintenance base),
> each named with the ticket id (`<type>-WEBUI-<id>-<kebab-summary>-<base>`), and **raise a PR
> for each**. Two branches, two PRs — never fix on only one base. (If the ticket's `fixVersions`
> genuinely exclude a base, state that explicitly in your summary and skip it — no need to ask.)

> **Core rule — every phase ends with a verification gate. Never advance on intent.** Each phase
> below has an **Exit gate**: a check you actually execute (an API call, a `curl`, a file listing)
> that proves the phase did what it was supposed to. Confirm the gate before starting the next
> phase, and fix-then-recheck if it fails — a phase is "done" only when its gate passes. Saying a
> step happened is not evidence that it happened. Runs have repeatedly shipped with attachments that
> never uploaded, a QA checklist comment that shouldn't be on the ticket, evidence QA couldn't read,
> and a fix summary with no verification steps — every one of those is caught by a gate below.
> Phase 11 re-checks all of them in one pass and is **mandatory** before you report the run finished.

Useful constants:
- Atlassian cloudId: `252cce86-035e-4b0e-abd2-3c002935632f` (site `hyland.atlassian.net`)
- Ready-for-QA checklist page: `4169400498` · Signed-commits guide: `4125330218`
- Upstream repo: `nuxeo/nuxeo-web-ui` · bases: `lts-2025` and `maintenance-3.1.x`

## Setup check — first-time users
Before the first run on a new machine, verify the environment is set up. If anything is missing,
**pause and walk the user through it** (point them at [`.cursor/skills/README.md`](../README.md),
"One-time setup") — do not silently continue past a missing prerequisite:
- **Atlassian MCP** authenticated (a quick `atlassianUserInfo` call succeeds). If it returns
  `needsAuth`/403, run `mcp_auth` for the Atlassian namespace and have the user complete the OAuth
  login; confirm they have access to the **WEBUI** and **NXP** projects.
- **Jira token** for attachments: `~/.jira_email` and `~/.jira_token` exist (see README §2). If
  absent, have the user create them — never accept a token pasted into chat.
- **GitHub CLI**: `gh auth status` is logged in with push access to `nuxeo/nuxeo-web-ui`.
- **Signed commits**: `git config commit.gpgsign` is `true` with an SSH signing key registered on
  GitHub (README §4). The repo requires signed commits.
- **Local build**: Node ≥ 18 (`nvm use 22`) and `npm ci` done.

### Helper MCP servers (use them when available; fall back to raw CLI if not)
These MCPs make several phases more reliable. They are **optional accelerators** — if a server isn't
listed/ready, fall back to the raw `curl`/`docker`/`gh` commands documented in each phase. None of
them replace the repo-specific knowledge in this skill.
- **`playwright` MCP** — drives a real browser as tool calls (navigate, click, fill, snapshot,
  screenshot) for the Phase 2 repro + before/after screenshots. It does **not** record video, so
  keep `puppeteer-screen-recorder` for the required `.mp4`s.
- **`docker` MCP** — `run_container` / `fetch_container_logs` / `stop_container` / `remove_container`
  etc. for the Phase 2 throwaway instance. **Never** stop/remove a container you didn't create — the
  live instance (often `nuxeo` on port 8080) must stay untouched; filter by your `nx-<ticket>` name.
- **`sonarqube` MCP** — `search_sonar_issues_in_projects` / `get_project_quality_gate_status` for
  Phase 7 (project key `nuxeo_nuxeo-web-ui`, org `nuxeo`). Needs a SonarCloud **user** token in the
  MCP config; if absent, fall back to the raw SonarCloud REST call shown in Phase 7.
- **`context7` MCP** — up-to-date third-party docs. Use for Nuxeo REST/Automation payloads
  (`/websites/doc_nuxeo_nxdoc`), Puppeteer (`/puppeteer/puppeteer`), and GitHub GraphQL/REST shapes.
  It has **no** coverage of `nuxeo-web-ui`/`nuxeo-elements` internals — don't rely on it for those.

Once verified (or on subsequent runs), proceed.

## Phase 0 — Plan (non-blocking)
Restate the goal and list the phases below as concrete steps (a TODO list). **Show the plan, then
immediately proceed — do not wait for approval.** Re-plan on the fly if scope changes.

## Phase 1 — Understand the ticket
- `getJiraIssue` (cloudId above, `issueIdOrKey=WEBUI-<id>`, `fields:["*all"]` incl. `comment`).
  If Atlassian tools aren't listed, call `mcp_auth` for the Atlassian server first.
- Read the description **and every comment** (repro steps, expected vs actual, affected
  versions). Note `fixVersions` — they map to the base branches you must target.

**Exit gate:** you can state, in one sentence each, the user-visible symptom, the expected
behaviour, and which bases `fixVersions` requires. If any of the three is still a guess, keep
reading the ticket — do not start reproducing against an assumed symptom.

## Phase 2 — Reproduce + capture evidence (first hands-on step)
**Reproduce the bug on the `lts-2025` branch before creating any feature branch or touching code.**
Confirming the bug exists — and capturing the "before" evidence — is the first thing you do after
understanding the ticket. Check out the base first so the repro reflects released code:
```bash
git fetch origin lts-2025
git switch -c lts-2025 origin/lts-2025 2>/dev/null || git switch lts-2025 && git pull --ff-only
```
> **Reproduce autonomously (no confirmation).** Default to a **throwaway Docker container** (recipe
> below) — never touch a live/running container. Only fall back to another approach if Docker is
> unavailable.
>
> **Prefer the `docker` MCP** for container lifecycle when it's available: `run_container` (never
> `create_container`+`start_container`), `fetch_container_logs` to wait for readiness, and
> `remove_container` for teardown. First `list_containers` to see which host ports are taken so you
> don't collide with the live instance. The raw `docker` CLI recipe below is the fallback.
>
> **Always capture BOTH images and videos** — before *and* after. Screenshots for the ticket/summary,
> screen recordings for QA. Capture both every time; never ask which format.
>
> **Prefer the `playwright` MCP** to drive the repro and take the before/after screenshots
> (`browser_navigate` → `browser_snapshot`/`browser_find` → `browser_click`/`browser_type` →
> `browser_take_screenshot`). Use `browser_snapshot` (accessibility tree) to locate elements — it
> also sees into shadow DOM, avoiding the manual shadow-root walking below. **Video is the one gap:**
> Playwright MCP can't record `.mp4`, so still use the `puppeteer-screen-recorder` recipe for the
> required recordings. When you need a raw DOM probe, `browser_evaluate` runs JS on the page.

Create the evidence folder up front and put **before/after** screenshots, **videos**, and logs there:
```bash
mkdir -p ~/Desktop/<TICKET-ID>   # e.g. WEBUI-1234 or ELEMENTS-1856
```
- Reproduce against a real instance. If the bug needs a special setup (e.g. multi-repository),
  stand up a throwaway Docker instance rather than touching any live container; remove it with
  `docker rm -f <name>` (or `docker compose down -v`) when done.
- To A/B the fix on the real `/nuxeo/ui` URL, build the branch (`npm run build`) and hot-swap
  `main.bundle.js` into the running instance's `nxserver/nuxeo.war/ui`, keeping `.unpatched` /
  `.patched` copies to toggle. Note any build/version-skew artifacts (e.g. `ts/ui` layout 404s)
  as environment-only, not regressions.
- Capture the **before** evidence (bug visible) before fixing.

### Standing up a throwaway instance (single-container recipe — preferred)
The repo `docker-compose.yml` is stale (proxy upstreams `nuxeo_1`/`webui` don't match modern
compose service DNS), so prefer a single container that serves Web UI directly at `/nuxeo/ui/`:
```bash
# If Docker Desktop is off: `open -a Docker` and wait until `docker info` succeeds.
# Reuse a CLID + image from an existing Nuxeo container if you have one (package download needs
# Nuxeo Connect registration — without a CLID it fails with "Registration required"):
CLID=$(docker inspect <existing-nuxeo> --format '{{range .Config.Env}}{{println .}}{{end}}' \
       | sed -n 's/^NUXEO_CLID=//p')
# Pick a FREE host port (8080 is often taken by a live container — never disturb it):
docker run -d --name nx-<ticket> -p 8090:8080 \
  -e NUXEO_DEV_MODE=true -e NUXEO_PACKAGES="nuxeo-web-ui nuxeo-drive" -e NUXEO_CLID="$CLID" \
  docker-private.packages.nuxeo.com/nuxeo/nuxeo:2025
# Wait for readiness, then verify:
docker logs -f nx-<ticket>                 # until "Nuxeo Platform Started"
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8090/nuxeo/runningstatus   # 200
```
Seed test data over REST + Automation (admin is `Administrator:Administrator`; **use explicit
`curl` flags, not shell vars — quoting `-u`/`-H` into a var breaks auth and yields 401**). If you're
unsure of the exact endpoint/payload for a REST or Automation operation, look it up via the
`context7` MCP against `/websites/doc_nuxeo_nxdoc` rather than guessing:
```bash
# create a folder/workspace
curl -s -u Administrator:Administrator -H "Content-Type: application/json" -X POST \
  http://localhost:8090/nuxeo/api/v1/path/default-domain/workspaces \
  -d '{"entity-type":"document","name":"sync-root-a","type":"Workspace","properties":{"dc:title":"Marketing Assets"}}'
# register it as a Drive sync root
curl -s -u Administrator:Administrator -H "Content-Type: application/json" -X POST \
  http://localhost:8090/nuxeo/site/automation/NuxeoDrive.SetSynchronization \
  -d '{"params":{"enable":true},"input":"doc:/default-domain/workspaces/sync-root-a"}'
```

### Skew-free A/B by deploying your own build for BOTH states
`npm run build` is fast (~15s), so build twice and deploy each into the container's UI dir. Both
captures then use the *same* dev build, differing only by your fix (eliminates marketplace skew):
```bash
UI=$(docker exec nx-<ticket> sh -lc 'find /opt/nuxeo/server -type d -name ui -path "*nuxeo.war*"' | head -1)
npm run build && cp -R dist /tmp/dist-patched                 # current tree (with fix)
git stash && npm run build && cp -R dist /tmp/dist-unpatched && git stash pop   # baseline
docker cp /tmp/dist-unpatched/. nx-<ticket>:"$UI/"            # deploy BEFORE, capture
docker cp /tmp/dist-patched/.   nx-<ticket>:"$UI/"            # deploy AFTER,  capture
```
Confirm the deployed bundle actually changed (addon elements land in a hashed
`dist/<addon>.<hash>.bundle.js`): `rg -c "<the-markup-you-added>" /tmp/dist-*/…bundle.js`.

**Two deploy gotchas that silently break the deployed app (both cost real time):**
- **`base-url` / broken links.** The dev build's `dist/index.html` hardcodes `<nuxeo-app base-url="/">`
  and `docker cp` drops it next to the server's `index.jsp` (which computes `base-url="<context>/ui/"`).
  Tomcat then serves *your* `index.html`, so `Nuxeo.UI.app.baseUrl` becomes `/` and `urlFor` yields
  root-relative `/#!/browse/...` for **every** link — clicking navigates outside `/nuxeo/ui/` and 404s
  (page.js runs `click:false`, so a wrong href is just a broken full navigation). Fix before capturing:
  edit the deployed `index.html` to `base-url="/nuxeo/ui/"` (or delete it so `index.jsp` is served —
  but then you lose your patched bundles). Verify: `Nuxeo.UI.app.baseUrl` and a sample
  `document.querySelector('nuxeo-app').urlFor({...,path,uid})` should both include `/nuxeo/ui/`.
- **Addon provider errors (e.g. `Invalid provider: box`).** Building with the default
  `NUXEO_PACKAGES` (…`nuxeo-liveconnect`…) loads cloud providers (`box`, `googledrive`) the target
  server may not have configured, and the page 404s with `Invalid provider: …`. Build scoped to just
  the addon under test — `NUXEO_PACKAGES="nuxeo-drive" npm run build` — so `index.html`'s
  `Nuxeo.UI.bundles` list drops the unrelated addons.
- After any redeploy, the browser caches `index.html`/bundles — **hard-refresh (Cmd+Shift+R)** or the
  Puppeteer runs (which set `setCacheEnabled(false)`) to see changes.

### Video capture (required — before AND after)
QA and the Ready-for-QA checklist expect a short screen recording of the bug and the fix, not just
stills. Record both `~/Desktop/WEBUI-<id>/WEBUI-<id>-before.mp4` and `-after.mp4`.

Drive a headless Chrome with Puppeteer and record with `puppeteer-screen-recorder` (it bundles its
own ffmpeg, so no system ffmpeg is needed). Do it in a throwaway repro dir, not the repo:
```bash
mkdir -p ~/Desktop/WEBUI-<id>/repro && cd ~/Desktop/WEBUI-<id>/repro
[ -f package.json ] || echo '{"name":"repro","private":true}' > package.json
npm install puppeteer puppeteer-screen-recorder
```
Recorder skeleton (reuse for before/after; the only difference is which bundle is deployed and the
user actions performed):
```js
const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const browser = await puppeteer.launch({ headless: 'new',
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--window-size=1280,800'] });
const page = await browser.newPage();
// Web UI gates bootstrap on `automation-ready` when navigator.webdriver is true (headless):
await page.evaluateOnNewDocument(() => { window.automationReady = true; });
await page.setViewport({ width: 1280, height: 800 });
await page.setCacheEnabled(false);
const rec = new PuppeteerScreenRecorder(page, { fps: 25, videoFrame: { width: 1280, height: 800 } });
await rec.start('/Users/<you>/Desktop/WEBUI-<id>/WEBUI-<id>-after.mp4');
/* ...navigate + interact (type creds with { delay: 90 }, add short sleeps so the flow is followable)... */
await rec.stop(); await browser.close();
```
Tips: bootstrap the app once (`/nuxeo/ui/`, ~4s) before driving the scenario; add ~2.5s pauses on the
key states (error page, login page, final document) so the video is readable; keep clips ~10–20s.

Concrete gotchas that cost time (learned the hard way):
- **Login form:** Nuxeo `login.jsp` fields are `#username` / `#password` (names `user_name` /
  `user_password`), submit is `.login_button` / `input[type=submit]` — not `input[name=username]`.
- **Deep shadow DOM:** Web UI content is nested in many shadow roots. Walk them recursively to find
  an element (e.g. `nuxeo-drive-sync-roots-management`) and to probe its rendered state
  (`isLink`/`href`) — a flat `document.querySelector` won't find it.
- **Verify with a DOM probe, not just pixels.** A new link that inherits the theme link colour looks
  almost identical to plain text in a static shot (before/after PNGs can be byte-identical). Prove the
  change by (a) logging the probe (`isLink:true`, `href=…`) and (b) `page.mouse.move` to **hover** the
  link so the underline shows in a screenshot.
- **In-app navigation from a dev build:** `urlFor` yields a root-relative `/#!/browse/...`; a raw
  `a.click()` resolves that against the origin (→ wrong page). To show the target opens, `page.goto`
  the correct base: `${BASE}/ui/#!${href.replace(/^\/#!/, '')}`. The base difference is a
  dev-build/marketplace artifact, not a regression.

If the repro instance's web-ui version differs from your source branch (marketplace `main.bundle.js`
is built and lazy-loads assets differently than `npm run build`), the safest way to get a faithful
**after** video is: deploy your dev `dist/` and, if lazy `elements/*.html` requests 404, mirror the
instance's root html tree into `ui/elements/` so they resolve. Patching the marketplace bundle's
minified code is unreliable (the error-handling code path and property names drift between versions).

**Exit gate — run it, don't assume it.** You need both videos (`-before.mp4`, `-after.mp4`) plus at
least one screenshot per state (either `<TICKET-ID>-before.png` or numbered state shots like
`<TICKET-ID>-before-1-scrolled.png`), and every file must be big enough to be real. A sub-10 KB
`.mp4` is a black or truncated capture, and a black video is worse than none because it looks done.
This is also the gate that catches "the recorder threw and nobody noticed":
```bash
ls -l ~/Desktop/<TICKET-ID>/
find ~/Desktop/<TICKET-ID> -maxdepth 1 \( -name '*.mp4' -o -name '*.png' \) -size -10k -print  # must print nothing
```
The before/after pair must also show *different* states. If the two PNGs are byte-identical
(`cmp -s`), the difference isn't visible in a still — hover the element or add a DOM probe (see the
gotchas above) and re-capture, rather than shipping evidence QA can't interpret.

## Phase 3 — Branches (both bases)
**Only after the bug is reproduced on `lts-2025`**, create one feature branch per base — cut from the
bases, not from your local repro state — named per the `nuxeo-web-ui-pr` skill
(`<type>-WEBUI-<id>-<kebab-summary>-<base>`):
```bash
git fetch origin lts-2025 maintenance-3.1.x
git switch -c <type>-WEBUI-<id>-<summary>-lts-2025 origin/lts-2025
git switch -c <type>-WEBUI-<id>-<summary>-maintenance-3.1.x origin/maintenance-3.1.x
```
Implement on `lts-2025` first, then cherry-pick to `maintenance-3.1.x` (see the PR skill's backport section).

## Phase 4 — Fix (no new induced issues)
> **Fix autonomously (no confirmation).** Once the issue is reproduced and the "before" evidence is
> captured, proceed straight to the fix. Still **print the identified root cause first** (see below)
> so it lands in the record before any change.

- Identify the real root cause (often in `node_modules/@nuxeo/...` i.e. the sibling
  `nuxeo-elements` repo) before editing. **Print the root cause to the user** — a clear,
  explicit statement of what is actually causing the bug (file/function/line and why) — before
  making any change. Then make the **minimal** change in `nuxeo-web-ui`.
- Keep the diff focused — do not bundle unrelated files. Capture the **after** evidence, including
  the **after video** (Phase 2 recipe) showing the fixed behavior end-to-end.
- **Extract self-contained/cross-cutting client logic into a Polymer behavior**, don't inline it
  into already-large elements (`nuxeo-app.js` is 900+ lines). If a feature has its own state,
  constants, lifecycle wiring (arm on `ready`/`attached`, tear down on `detached`) and listeners
  with no coupling to the host's core responsibilities, put it in `elements/behaviors/nuxeo-<name>-behavior.js`
  exporting `Nuxeo<Name>Behavior` (`@polymerBehavior Nuxeo.<Name>Behavior`) and compose it via the
  `behaviors` array — mirroring `NuxeoAppDrawerResizeBehavior` and the `AGENTS.md` convention. This is
  a common reviewer ask; doing it up front avoids a review round-trip. Keep on the host only what the
  template/host truly needs (e.g. a method bound in the template, or a `<nuxeo-resource>` the behavior
  references via `this.$`); behavior methods are mixed into the host, so template bindings and host
  lifecycle calls to them still resolve. Verify the composition with the full unit-test suite.
- For generic **third-party** API/syntax you're unsure about (Polymer lifecycle, a JS/DOM API, a
  library method), consult the `context7` MCP for current docs instead of guessing. Keep using this
  skill and the repo's `AGENTS.md`/existing elements as the source of truth for `nuxeo-web-ui` and
  `nuxeo-elements` internals — Context7 does not index those.

## Phase 5 — Validate locally (gate before any push)
Run the same checks the PR CI gates on:
```bash
bash .cursor/skills/nuxeo-web-ui-pr-checks/scripts/pr-checks.sh --fix
```
Only proceed when it exits `0`. Revert incidental `package-lock.json` churn.

**Exit gate:** `pr-checks.sh` exited `0`, and you have the actual lint/unit numbers to quote in the
summary (e.g. "2327 unit tests passing"). "Tests pass" without a count usually means they weren't
re-run after the last edit.

> **No manual-verification pause.** In YOLO mode do not stop to ask for manual verification — the
> automated before/after capture (Phase 2) already proves the fix. Instead, write the exact numbered
> **"Steps to verify the fix"** and fold them into the final summary (Phase 9) and the Jira comment,
> so a human can re-verify later.

## Phase 6 — Commit (signed) + raise PRs
This is the "commit and raise PR" trigger.
> **Commit + push + open PRs autonomously (no confirmation).** Proceed without asking. (The safety
> Guardrails still apply: only feature branches; never force-push protected branches.)
- **Signed commits are required.** Verify signing is configured; if not, set up SSH signing
  per page `4125330218` (`gpg.format=ssh`, `user.signingkey=<key>.pub`, `commit.gpgsign=true`).
  Confirm a commit is signed: `git log -1 --format='%G?'` → `G`.
- Commit `WEBUI-<id>: <summary>` with a why-focused body (heredoc).
- Open one PR per base via the `nuxeo-web-ui-pr` skill. **Always push the branch to `origin`
  (`nuxeo/nuxeo-web-ui`) and open a same-repo PR — never a fork.** CI checks out the branch by name
  from the upstream repo, so fork branches aren't found and fork PRs fail at checkout (red
  lint/unit-test/a11y). Use the Problem/Root cause/Changes/Test plan/Notes body template.
- After pushing, confirm GitHub shows commits as **Verified**:
  `gh api repos/nuxeo/nuxeo-web-ui/commits/<sha> --jq '.commit.verification'` → `verified:true`.
  `unknown_key` means the signing key isn't added on GitHub as a **Signing Key** (separate
  from an Authentication key) — fix that, no re-push needed.

**Exit gate:** both PRs exist, target the two different bases, and every commit on each is
`Verified`. One command, and it must list two rows with different bases:
```bash
for pr in <PR-lts> <PR-maint>; do
  gh pr view "$pr" --repo nuxeo/nuxeo-web-ui --json number,baseRefName,url \
    --jq '"#\(.number) → \(.baseRefName)"'
  gh api repos/nuxeo/nuxeo-web-ui/pulls/"$pr"/commits \
    --jq '[.[]|.commit.verification.verified]|"  verified: \(.)"'
done
```

## Phase 7 — Watch checks; fix or rerun
```bash
gh pr view <pr> --repo nuxeo/nuxeo-web-ui --json statusCheckRollup \
  --jq '[.statusCheckRollup[]|{name:(.name//.context),conclusion:(.conclusion//.state)}]'
```
> **Never wait on the functional tests.** The `ftest` / cross-repo `web-ui` checks take tens of
> minutes (they boot a Nuxeo server and drive WebdriverIO), so polling them stalls the whole run.
> Watch only the fast gating checks — **lint**, **unit tests**, and `a11y`/`sonar` once they report —
> then move straight on to Phase 7.5. Snapshot the ftest state, don't block on it:
> ```bash
> gh pr view <pr> --repo nuxeo/nuxeo-web-ui --json statusCheckRollup \
>   --jq '[.statusCheckRollup[]|select((.name//.context)|test("ftest|web-ui"))
>     |{name:(.name//.context),status:(.conclusion//.state)}]'
> ```
> Report an unfinished ftest as *in progress, not waited on* (Phase 10) rather than calling it green.
> Only read an ftest log when it has already come back **failed** — and if it fails on something the
> change cannot plausibly touch, re-run it (`gh run rerun <run-id> --failed`) instead of investigating.
- Real failure → read the failing job log (`gh api repos/nuxeo/nuxeo-web-ui/actions/jobs/<jobId>/logs`),
  fix on the branch, re-run the gate, push.
- Known flake (e.g. `nuxeo-document-tree` "Tree should collapse…") that passes locally →
  re-run, don't "fix": `gh run rerun <run-id> --failed`.
- Telemetry noise (`catchpoint/workflow-telemetry-action` 403s, Node-20 deprecation) is not a failure.
- **Apply every post-PR change to both PRs.** Any fix after the PRs exist — review feedback
  (Copilot/Sonar/reviewers), CI fixes, follow-ups — must land on **every** base branch, not just one.
  Commit once (signed), cherry-pick the same commit onto each other base, re-run the gate, push, and
  confirm CI reruns on both PRs. See the `nuxeo-web-ui-pr` skill ("Keep both PRs in sync").
- Sonar surfaces new issues even when the Quality Gate passes. **Prefer the `sonarqube` MCP:**
  `get_project_quality_gate_status` and `search_sonar_issues_in_projects` (projectKey
  `nuxeo_nuxeo-web-ui`, `pullRequestId=<pr>`, `resolved=false`) — it returns structured issues and
  the gate status directly. Fall back to the raw REST call if the MCP isn't configured (needs a
  SonarCloud user token): `GET https://sonarcloud.io/api/issues/search?componentKeys=nuxeo_nuxeo-web-ui&pullRequest=<pr>&resolved=false`.
  Get Copilot inline comments via `gh api repos/nuxeo/nuxeo-web-ui/pulls/<pr>/comments`; fix both.
- **Close the loop on every review thread — reply *and* resolve.** After the fix for a comment is
  pushed to **all** bases, on **each** PR: (1) reply to the thread citing the commit
  (`gh api repos/<owner>/<repo>/pulls/<pr>/comments -f body='…' -F in_reply_to=<commentId>`), then
  (2) mark it resolved. A reply alone does **not** resolve the thread — resolving needs the GraphQL
  `resolveReviewThread` mutation. Do this autonomously (no confirmation); only leave a thread open if
  you disagree with the comment, in which case reply explaining why instead of resolving.
  ```bash
  # list unresolved threads (thread id + first comment) for a PR
  gh api graphql -f query='{repository(owner:"<owner>",name:"<repo>"){pullRequest(number:<pr>){
    reviewThreads(first:50){nodes{id isResolved comments(first:1){nodes{author{login} body}}}}}}}' \
    --jq '.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved==false)
      |{id,first:.comments.nodes[0].author.login,snippet:(.comments.nodes[0].body[0:80])}'
  # resolve one thread
  gh api graphql -f query='mutation{resolveReviewThread(input:{threadId:"<threadId>"}){thread{isResolved}}}'
  ```
  Note: `<owner>/<repo>` is `nuxeo/nuxeo-elements` when the fix lands there (e.g. `WEBUI`/`ELEMENTS`
  fixes in shared UI components), otherwise `nuxeo/nuxeo-web-ui`.
- **Keep review-process churn on GitHub — never on the Jira ticket.** Replies to Copilot/Sonar/
  reviewer comments, "review feedback addressed" notes, i18n-key renames, CI-flake reruns, and any
  other PR-mechanics updates belong on the **PR** (thread replies + commits), *not* as Jira comments.
  The ticket is for the customer/QA-facing record only (see Phase 7.5). If a review change materially
  alters the fix, update the existing fix-summary comment **in place** (same `commentId`) rather than
  adding a new "addressed Copilot" comment.

## Phase 7.5 — Update the ticket with the fix
> **Update the ticket autonomously (no confirmation).** Post the fix-summary comment as soon as the
> PRs are open and CI status is known. No need to ask first.

Post the **structured fix-summary comment** (the Phase 9 sections) on the Jira issue via
`addCommentToJiraIssue` (cloudId above, `contentFormat:"markdown"`). Include: issue, root cause, the
files changed, **both PR links** (one per base), verification (lint/test counts), reproduce +
verify steps, and the before/after evidence in the **two-block "Before fix / After fix" layout**
from Phase 9 §7 (never a single run-on sentence). Keep the wording honest — only say a file is
"attached" once it actually is.

> **Only these two comment types go on the ticket:** (1) the fix-summary comment and (2) the
> evidence/attachment update. The Ready-for-QA checklist (Phase 8) is an **internal** gate — output it
> in chat, never as a Jira comment. **Do NOT** post PR-review churn to Jira — Copilot/Sonar/reviewer
> replies, "review feedback addressed" / key-rename notes, and CI-flake reruns stay on the PR (see
> Phase 7). Reviewers see the ticket; extra process comments are noise. If review changes materially
> affect the fix, edit the existing fix-summary comment in place (same `commentId`) instead of adding
> another comment.

> **Write real Markdown, not Jira wiki markup.** With `contentFormat:"markdown"` the body must be
> GitHub-flavoured Markdown — `###` headings, `**bold**`, `-`/`1.` lists, and triple-backtick fenced
> code blocks. Do **NOT** use Jira wiki syntax (`h3.`, `{code}…{code}`, `*bold*`, `# ordered`): it
> renders **literally** as text (you'll see a stray `h3.` in the comment). If you need to fix a
> comment you already posted, re-send `addCommentToJiraIssue` with the same `commentId` to update it
> in place rather than adding a duplicate.

**Attaching evidence (images/videos/CSVs) — MCP can't do it.** The Atlassian MCP has *no* attachment
tool (only comment/edit/search), so binary uploads must go through the Jira REST attachments endpoint.
Do **not** claim a file is attached when it isn't.

Stored credentials (created for this account, outside the repo — never commit these):
- `~/.jira_email` — Atlassian account email
- `~/.jira_token` — Jira API token (`chmod 600`; rotate at
  https://id.atlassian.com/manage-profile/security/api-tokens if leaked)

If `~/.jira_token` exists, upload attachments directly — no need to ask the user for a token. First
verify auth (`GET /rest/api/3/myself` → expect `200`). If it returns **`401`** the stored token is
expired/revoked, not missing: don't paste a token into chat — ask the user to refresh it at
https://id.atlassian.com/manage-profile/security/api-tokens and re-save `~/.jira_token`, then retry
the upload. Read the creds with the trailing newline stripped (`tr -d '\r\n'`) — a stray newline
also yields a spurious `401`. Then upload:
```bash
cd ~/Desktop/<TICKET-ID>
U="$(tr -d '\r\n' < ~/.jira_email):$(tr -d '\r\n' < ~/.jira_token)"
for f in <TICKET-ID>-before.png <TICKET-ID>-before.mp4 <TICKET-ID>-after.png <TICKET-ID>-after.mp4; do
  curl -s -u "$U" -H "X-Atlassian-Token: no-check" -F "file=@$f" \
    https://hyland.atlassian.net/rest/api/3/issue/<TICKET-ID>/attachments \
    | python3 -c "import sys,json;d=json.load(sys.stdin);print('OK', d[0]['filename']) if isinstance(d,list) and d else print('FAIL', d)"
done
```
**The upload printing `OK` is not proof.** A 200 with an empty body, a silently skipped file, or a
loop that never ran all read as "done" in a transcript. Read the attachments back off the ticket and
compare against what you meant to upload — this is the single most-missed step in past runs:
```bash
curl -s -u "$U" "https://hyland.atlassian.net/rest/api/3/issue/<TICKET-ID>?fields=attachment" \
  | python3 -c "import sys,json;[print(a['filename'], a['size']) for a in json.load(sys.stdin)['fields']['attachment']]"
```
Both videos and your before/after screenshots must be listed with a non-trivial size. If any is
missing, re-upload it; only then may the summary say "attached".
**Add the PRs as Jira "web links" (remote links), not just URLs in a comment.** The Atlassian MCP has
**no create-remote-link tool** (`getJiraIssueRemoteIssueLinks` is read-only; `createIssueLink` only
links two Jira issues). So use the REST `remotelink` endpoint directly — one call per base PR, using a
stable `globalId` so re-runs update in place instead of duplicating:
```bash
U="$(tr -d '\r\n' < ~/.jira_email):$(tr -d '\r\n' < ~/.jira_token)"
for pr in <PR-lts> <PR-maint>; do
  curl -s -u "$U" -X POST -H "Content-Type: application/json" \
    "https://hyland.atlassian.net/rest/api/3/issue/<TICKET-ID>/remotelink" \
    -d "{\"globalId\":\"pr-$pr\",\"object\":{\"url\":\"https://github.com/nuxeo/nuxeo-web-ui/pull/$pr\",\"title\":\"#$pr <TICKET-ID>: <pr-title>\"}}" \
    -w '\nremotelink %{http_code}\n'   # expect 201 (created) or 200 (updated)
done
```
If `~/.jira_token` is absent, have the user create it (`printf '%s' '<token>' > ~/.jira_token &&
chmod 600 ~/.jira_token`) rather than pasting the token into chat. Drag-and-drop in the browser is the
manual fallback.

**Exit gate for Phase 7.5 — read the ticket back and check all four things:**
1. Both videos and your before/after screenshots are listed by the attachments API (command above).
2. Both PRs appear in `GET /issue/<TICKET-ID>/remotelink`.
3. The fix-summary comment exists and actually contains the root cause, the changed files, both PR
   links, the lint/test numbers, the numbered **steps for QA to verify**, and the two-block
   Before fix / After fix evidence list.
4. There is **no** Ready-for-QA checklist comment on the ticket.

Read a rendered copy of what you posted rather than trusting the call you made — Markdown that
silently rendered as literal `h3.` text, or a summary missing the verify steps, both look fine from
the caller's side:
```bash
curl -s -u "$U" "https://hyland.atlassian.net/rest/api/3/issue/<TICKET-ID>/comment?maxResults=100" \
  | python3 -c "import sys,json;[print('---',c['id'],json.dumps(c['body'])[:1200]) for c in json.load(sys.stdin)['comments']]"
```

## Phase 8 — Ready for QA checklist (internal only — do NOT post to Jira)
Evaluate page `4169400498` against both PRs and produce a Markdown table (Question | Link |
Y/N/NA | Comments). Check, per PR: review comments resolved; before/after evidence attached (screenshots **and the
before/after videos** from Phase 2); both PRs linked on the ticket; no open Copilot threads (GraphQL
`reviewThreads.isResolved`); all checks green; ≥2 approvals incl. lead; all commits Verified.

> **This checklist is an internal readiness gate — output it in chat ONLY. Do NOT post it as a Jira
> comment.** Print the table in your reply and stop there; do not call `addCommentToJiraIssue` with
> it. It is process/QA-tracking noise on a customer-facing ticket, which gets only the two Phase 7.5
> comments, and the ticket's own DoD checklist field is updated separately by the team rather than
> via a comment. (If a checklist comment was posted by mistake, delete it:
> `curl -u "$(cat ~/.jira_email):$(cat ~/.jira_token)" -X DELETE
> https://hyland.atlassian.net/rest/api/3/issue/<TICKET-ID>/comment/<commentId>`.)

Flag in the table what stays manual: uploading the before/after videos to the ticket (MCP can't
attach — see Phase 7.5), dev-panel PR links, and approvals.

**Exit gate:** every row is Y or a justified NA — a row you never checked is not NA, it's unfinished,
so go and check it. And confirm the checklist did **not** reach Jira: re-list the ticket's comments
(Phase 7.5 gate) and verify none of them contains the table. If one was posted by mistake, delete it
with the `curl -X DELETE` above and re-list to confirm it's gone.

## Phase 9 — Final fix summary (always output)
End every run with a single, structured summary — print it in chat **and** post it as the Jira
fix-summary comment (Phase 7.5). Use exactly these sections, in this order:

1. **Issue** — the user-visible symptom and impact (1–2 sentences), with the ticket link.
2. **Root cause** — what actually causes it (file / function / code path and why).
3. **Fix provided** — what changed and why it's safe; list the files touched and **both PR links**.
4. **Steps to reproduce the issue** — numbered and copy-pasteable. **Explicitly call out any local
   environment changes required** — e.g. "inject a phantom row into the `user2group` table", a
   specific `NUXEO_PACKAGES` value, an LDAP / multi-repository setup, or seed data created via
   REST/Automation. If none are needed, say "no environment changes required".
5. **Steps to verify the fix** — numbered: how to build/deploy the patched branch, the exact
   URL/screen to open, the actions to perform, and the expected (fixed) result vs. the old behavior.
6. **Areas that may be affected (impact / regression surface)** — call out everything the change
   could ripple into, so QA knows where to focus and reviewers understand the blast radius. Cover:
   - **Other consumers of the touched code** — every element/screen that imports or shares the
     changed file, method, behavior, or i18n key (e.g. a shared element used by multiple layouts, a
     `nuxeo-elements` change consumed by all of `nuxeo-web-ui`). Search for usages before claiming
     "isolated".
   - **Adjacent behaviors in the same component** — pagination, sorting, filtering, add/remove,
     counts, empty states, permissions/read-only — anything that shares state with what you changed.
     Note which you exercised.
   - **Edge cases & scale** — empty/1-item/large lists, multiple pages, special characters,
     permissions variants, and any case intentionally left out of scope (state it explicitly).
   - **Cross-cutting concerns** — i18n (new keys need translations across all locales),
     accessibility, theming/styles, and the two base branches (`lts-2025` vs `maintenance-3.1.x`).
   - **Explicitly list what was NOT affected** when you verified it (e.g. "nested-groups table and
     permissions table untouched; unit suite still green"). Keep it honest — only list something as
     unaffected once you've actually checked.

7. **Evidence** — list the evidence files in **two clearly separated, labelled blocks**, never as one
   run-on sentence. Use exactly this shape (each file on its own line; images *and* video in both
   blocks), so QA can see at a glance which file is which state:

   ```markdown
   **Evidence**

   Before fix:
   - `<TICKET-ID>-before.mp4` — <one-line description>
   - `<TICKET-ID>-01-<state>.png` — <one-line description>

   After fix:
   - `<TICKET-ID>-after.mp4` — <one-line description>
   - `<TICKET-ID>-02-<state>.png` — <one-line description>
   ```

   Keep it honest: only say a file is "attached" once it actually is (see Phase 7.5). If an upload is
   still pending (e.g. token refresh), say so under the relevant block rather than blurring it into the
   list. Local paths live under `~/Desktop/<TICKET-ID>/` (`-before.{png,mp4}` / `-after.{png,mp4}`).

**Exit gate:** re-read your own summary as if you were the QA engineer who has never seen the ticket.
It fails the gate if you cannot answer all three from the text alone: what was broken, what to click
to see it fixed, and which file shows the before state. Sections 6 (verify steps) and 7 (evidence)
are the ones that go missing under time pressure — both are mandatory, never "obvious from the PR".

## Phase 10 — Clean up & report
- Tear down the throwaway repro container(s): `docker rm -f nx-<ticket>` (or the `docker` MCP's
  `remove_container` with `force:true`, targeting only your `nx-<ticket>`). Never remove or disturb
  pre-existing/live containers.
- Leave the evidence files in `~/Desktop/<TICKET-ID>/` so they can be attached to the ticket.
- Report the final CI state of both PRs, check by check. End the run once lint and the unit tests
  are green — do **not** keep the run alive polling `ftest` / the cross-repo `web-ui` check. List any
  such check as "still running, not waited on" so nobody reads the summary as fully green, and say who
  should look at it later (or offer to check back on request).

## Phase 11 — Final verification sweep (mandatory; loop until it passes)
Individual exit gates catch a phase as it happens; this re-checks **every** one of them against live
Jira and GitHub state at the end, so a gate that was skipped, or something that regressed later in
the run, can't slip through. It is the last thing you do:
```bash
bash .cursor/skills/fix-nuxeo-web-ui-bug/scripts/verify-run.sh <TICKET-ID> <PR-lts> <PR-maint>
```
It prints PASS/FAIL per gate and exits non-zero if any failed:
1. Jira credentials work (a 401 here means every later gate is a false failure, so it stops early).
2. Both videos and at least one screenshot per state exist locally and are large enough to be real.
3. They are **actually attached to the ticket**, read back from the attachments API.
4. Both PRs are linked on the ticket as remote links.
5. The fix-summary comment exists and covers root cause, lint/test verification, QA verify steps, and
   both PR links.
6. **No** Ready-for-QA checklist comment is on the ticket.
7. Evidence in the comment uses the two Before fix / After fix blocks.
8. Both PRs target different bases, all commits are Verified, and no review thread is unresolved.
9. Gating checks are green; `ftest` is reported but never waited on.

**Loop, don't report.** On any FAIL: fix that specific thing, re-run the script, repeat. Only when it
exits `0` may you tell the user the run is complete or treat the ticket as Ready for QA. If a gate
genuinely cannot pass (e.g. the Jira token needs a human to refresh it), say so explicitly in the
summary as an outstanding item — never quietly drop it.

## Recommended extras (do these when applicable, still autonomously)
- **Add/adjust a functional test.** For user-facing behavior, add a Gherkin scenario
  (`ftest/features/*.feature`) plus page object / step definition so the fix is covered end-to-end —
  the DoD expects "functional tests updated/added".
- **Regression sanity.** The local gate already runs the full unit suite; report the pass count.
- **Keep both PRs identical.** Any later change (review feedback / CI fix) is committed once and
  cherry-picked onto the other base so the two PRs never diverge.
- **Evaluate the Ready-for-QA checklist** (Phase 8) and report it as a table in chat — never as a
  Jira comment.
- **Attach the videos.** MCP can't attach — provide the ready-to-run `curl` (Phase 7.5) or note the
  drag-and-drop fallback so QA gets the recordings.

## Guardrails (these still hold in YOLO mode)
- Never force-push to `lts-2025` / `maintenance-3.1.x`; only to feature branches (`--force-with-lease`).
- Never edit git config silently beyond the one-time signing setup; confirm global config changes.
- Keep the PR scoped to the fix — never bundle unrelated files.
- YOLO relaxes *confirmation gates only*. It does **not** authorize destructive/irreversible git
  operations, force-pushes to protected branches, or committing secrets.
