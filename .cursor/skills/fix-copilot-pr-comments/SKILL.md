---
name: fix-copilot-pr-comments
description: >-
  Batch-resolve GitHub Copilot review comments across ALL of your open pull
  requests in one pass. Fetches every open PR you authored that still has
  unresolved Copilot review threads, builds a single cross-PR worklist (grouping
  duplicate findings on backport pairs so each fix is authored once), applies the
  fixes respecting repo conventions, runs the gating checks, then replies to and
  resolves every Copilot thread — and loops until Copilot's re-review adds no new
  comments. Use when Copilot keeps drip-feeding review comments across
  re-reviews, or when the user says "fix all copilot comments", "resolve copilot
  reviews on my PRs", or "clear my open copilot threads in one go".
---

# Fix Copilot PR comments — batch, across all your PRs

Copilot reviews incrementally: it re-runs on each push and often surfaces *a few
more* comments each time. Handling one PR / one comment at a time turns into an
endless back-and-forth. This skill collapses that into a single sweep: gather
**all** unresolved Copilot threads across **all** your open PRs, fix them
together, then loop until Copilot stops finding things.

Default repo: `nuxeo/nuxeo-web-ui`. Default author: you (`@me`). Both are
overridable (see the scripts).

## Prerequisites
- `gh` authenticated (`gh auth status`) with access to the repo, and `jq`.
- Local checkout able to run the repo's gating checks (`npm run format && npm run lint && npm test`).
- Repo requires **signed commits**; WEBUI fixes ship as a **backport pair** (`lts-2025` +
  `maintenance-3.1.x`) — keep both branches identical by committing once and cherry-picking.

## Workflow

Copy this checklist and track progress:

```
- [ ] 1. Discover: list all unresolved Copilot threads across my open PRs
- [ ] 2. Triage & group: one worklist; collapse backport-pair duplicates; drop false positives
- [ ] 3. Fix at the source (per unique issue), respecting AGENTS.md/conventions
- [ ] 4. Validate: format + lint + unit tests (gating checks)
- [ ] 5. Commit (signed) + backport (commit once, cherry-pick to sibling) + push
- [ ] 6. Reply to and resolve every addressed thread
- [ ] 7. Re-trigger Copilot on ALL PRs, wait for a fresh review, re-fetch — repeat until 0 new comments everywhere
```

### Phase 1 — Discover
Run the helper; it prints one JSON object per unresolved Copilot thread across
every open PR you authored:

```bash
bash .cursor/skills/fix-copilot-pr-comments/scripts/list-copilot-threads.sh
# other repo / author:
bash .cursor/skills/fix-copilot-pr-comments/scripts/list-copilot-threads.sh nuxeo/nuxeo-web-ui @me
```

Each record has: `pr`, `base`, `head`, `threadId`, `commentId`, `path`, `line`,
`outdated`, `url`, `body`. If it prints nothing, there are no open Copilot
threads — you're done.

> Why the script and not the MCP: neither the GitHub nor Atlassian MCP exposes
> review-thread *resolution*; only the REST/GraphQL API does. The scripts wrap
> the exact `gh api` calls.

### Phase 2 — Triage & group into ONE worklist
Read every `body` and build a single list of **unique issues**, not per-PR items:

- **Collapse backport pairs.** WEBUI fixes ship as two PRs (base `lts-2025` +
  `maintenance-3.1.x`) with identical code, so the *same* Copilot finding usually
  appears on both. Group by `(path, normalized-issue)` → one fix, applied once and
  cherry-picked (Phase 5). Keep the `{pr, threadId, commentId}` for **every**
  occurrence so you can resolve them all later.
- **Judge validity — do not blind-comply.** Copilot produces false positives and
  stale/`outdated:true` notes. For each: is it correct and worth doing?
  - **Valid** → fix it (Phase 3).
  - **Description-only mismatch** (code is right, PR body is stale) → fix the PR
    body, don't touch code (`gh pr edit <n> --body-file ...`).
  - **False positive / out of scope** → don't change code; reply on the thread
    with a short rationale and resolve it (or leave open for a human if genuinely
    debatable). Say which you did.
- Present the grouped worklist to the user before mass-editing (issue → affected
  PRs → planned action). Proceed unless they object.

### Phase 3 — Fix at the source
Apply each valid fix in the working tree, honoring `AGENTS.md` and repo
conventions (Polymer legacy factory, i18n keys in `i18n/messages.json` kept
alphabetical, `nuxeo-*` elements, no narrating comments, 120-col). Prefer the
minimal change that resolves the finding without regressions. If a finding is a
renamed i18n key or shared symbol, update **all** call sites + tests.

### Phase 4 — Validate
Run the gating checks (mirrors CI) before pushing — must pass:

```bash
npm run format && npm run lint && npm test
```

### Phase 5 — Commit, backport, push
- **Signed** commit with a `WEBUI-<id>`-style message describing the review fix.
- **Keep both PRs identical:** commit once on one base, then `git cherry-pick`
  the same commit onto the sibling base branch so the pair never diverges.
- Push each branch to **origin** (never a fork).
- After pushing, go straight to Phase 6 — **never wait on `ftest` / the cross-repo
  `web-ui` check**, which runs for tens of minutes. The local gate in Phase 4 is the
  signal; report an unfinished ftest as "still running, not waited on".

### Phase 6 — Reply to and resolve every thread
For **each** occurrence recorded in Phase 2 (both PRs of a pair), reply on the
thread and mark it resolved:

```bash
bash .cursor/skills/fix-copilot-pr-comments/scripts/reply-resolve-thread.sh \
  nuxeo/nuxeo-web-ui <pr> <commentId> <threadId> "Addressed in <sha>: <one-line what changed>. Cherry-picked to the sibling PR."
```

Keep replies short, specific, and honest (reference the commit sha). For a false
positive, the reply is the rationale instead of a sha.

### Phase 7 — Re-trigger Copilot on ALL PRs, loop until 0 new comments
This is the whole point. Copilot drip-feeds: even with no new commit, a fresh
review pass often surfaces *more* comments. So after resolving a round (Phase 6),
**re-request a Copilot review on every affected PR and keep looping until Copilot
returns 0 new comments across all of them** — not just the one you touched.

**Trigger with the bot login.** Copilot's reviewer login is the bot slug
`copilot-pull-request-reviewer[bot]`; the plain name `Copilot` is silently ignored
by the `requested_reviewers` endpoint.

**Termination is event-based, not time-based, and race-free.** Capture a `since`
timestamp *before* triggering, then wait for a Copilot review whose `submitted_at`
is later than `since`. This is correct even when the head SHA hasn't changed (a
re-request on the same head, where an older review for that head already exists —
matching only on `commit_id == head` would falsely look "done" and read stale
threads). ISO-8601 UTC compares as plain strings, so no date math.

Loop, per round:

1. Re-trigger Copilot on all your open PRs (prints the `since` to reuse in step 2):
   ```bash
   bash .cursor/skills/fix-copilot-pr-comments/scripts/trigger-copilot-review.sh nuxeo/nuxeo-web-ui --all
   ```
   (single PR: `trigger-copilot-review.sh nuxeo/nuxeo-web-ui <pr>`)
2. **Block until a FRESH review lands** on each PR (pass the `since` from step 1):
   ```bash
   bash .cursor/skills/fix-copilot-pr-comments/scripts/wait-for-copilot-review.sh nuxeo/nuxeo-web-ui <pr> "<since>"
   ```
   - Exit `0` → a review newer than `since` exists; the thread list is now trustworthy.
   - Exit `2` → timed out (Copilot disabled/slow). Do **not** claim "quiet" — report it.
3. Re-list and act on any **new** unresolved threads:
   ```bash
   bash .cursor/skills/fix-copilot-pr-comments/scripts/list-copilot-threads.sh
   ```
   - Non-empty → go back to Phase 2 for just those, fix, push, resolve (Phases 3–6).
   - Empty **after a confirmed fresh review** → that PR is clear for this round.
4. Repeat rounds until a full trigger→wait→list cycle yields **0 new comments on
   every PR**. Converges because each round Copilot's remaining findings shrink.
   Report the final state: PRs touched, issues fixed vs. dismissed (with reasons),
   commits/shas per base, and confirmation of zero open Copilot threads on all PRs.

## Guardrails
- **Keep review churn on GitHub — never on Jira.** Replies, "addressed" notes, and
  key-rename follow-ups live on the PR threads/commits, not as Jira comments — the
  ticket is for the customer/QA-facing record only.
- **Don't fabricate resolution.** Only resolve a thread once the fix is pushed (or
  you've posted a genuine dismissal rationale).
- **Don't diverge the backport pair.** Every code change is one commit
  cherry-picked across bases; resolve the matching thread on *both* PRs.
- **Scope.** This skill only touches PRs *you* authored. It won't edit others'
  PRs unless the user passes a different author explicitly.
