---
name: web-ui-release-notes
description: >-
  Write the customer-facing release notes for a Nuxeo Web UI release. One page per
  LTS line covers BOTH repositories (nuxeo-web-ui and nuxeo-elements), so the WEBUI
  and ELEMENTS release buckets are both in scope. Works out the version pair itself
  (2025.N.0 and its paired 3.1.Z), takes scope from the two fixVersion buckets,
  writes and fills any missing per-ticket "Release Notes Summary", groups and drafts
  the two pages with a coverage ledger, gets them scored by the
  web-ui-release-notes-review skill (4.5/5 to pass), then raises the PRs on the
  doc.nuxeo.com-content repo. Also handles the single-ticket "release notes summary"
  request. Use when asked for release notes for a version or a ticket, when handed
  an NXDOC release-notes ticket, or when preparing release-notes PRs.
---

# Nuxeo Web UI — release notes

You produce the **public, customer-facing** record of a Web UI release, published on
doc.nuxeo.com. Customers, support and pre-sales quote it back when something does not behave as
promised, so the bar is: **every sentence is traceable to a ticket in the release buckets, and
nothing in those buckets is silently omitted.**

**One release, one page per LTS line, two repositories.** `nuxeo-web-ui` and `nuxeo-elements`
release together on the same version number, and there is a *single* set of Web UI release notes
covering both. Both Jira release buckets — **WEBUI** and **ELEMENTS** — are always in scope. A
customer installs one Web UI package and does not know or care which repo a fix came from.

Two modes. Work out which one is being asked for before doing anything:

| Mode | Trigger | Output |
|---|---|---|
| **A — Ticket summary** | "release notes summary for WEBUI-2108", a single Jira key/URL | One or two sentences, written into the ticket's **Release Notes Summary** field |
| **B — Release page** | "release notes for 2025.20.0", "the next release", an NXDOC ticket, release-day prep | Two markdown pages (one per LTS line) + index updates, reviewed and scored, then PRs on `doc.nuxeo.com-content` |

## What this skill does not do

**Scope comes from the two Jira release buckets, and this skill trusts them.** Verifying the
buckets — that every `fixVersion` actually merged, that nothing merged is missing a
`fixVersion`, that the two lines hold the same set of tickets — is *release management*, not
release-notes writing. It happens **before** this skill is dispatched, today by hand and in
future by a separate release-checklist skill. So:

- Do not reconcile the buckets against `git log`, and do not count one bucket against the other.
- Do not stop, block or chase a ticket that sits in one bucket only. Write it once; it appears
  on both pages like every other change (the codebase is shared, so the pages are always twins).
- If something about the buckets looks wrong, **mention it in the handover and keep drafting.**
  Never withhold the draft over it.

The one place this skill still reads a repo is Step 1, to name the version — not to audit scope.

## Sources of truth

Never write from memory or from a code diff alone. These are the only authoritative inputs:

| What | Where |
|---|---|
| Per-ticket customer sentence | Jira field **Release Notes Summary** (`customfield_13954`, plain text) |
| Longer per-ticket detail | Jira field **Release Notes Description** (`customfield_13943`, rich text) |
| Release scope | `fixVersion` in **both** the **WEBUI** and **ELEMENTS** projects — the single source of scope |
| Next version | `package.json` `version` (`<next>-SNAPSHOT`) on each release branch — see Step 1 |
| Published pages | `nuxeo/doc.nuxeo.com-content` — branch `2025` (LTS 2025), branch `2023` (LTS 2023) |
| Page path | `src/nxdoc/web-ui/web-ui-release-notes/web-ui-release-notes-<slug>.md` |
| Index page | `src/nxdoc/web-ui/web-ui-release-notes.md` — sibling of that folder, not inside it |
| Live site | <https://doc.nuxeo.com/nxdoc/web-ui-release-notes/> |
| Release process | Confluence **WEB UI Release Checklist** (page `4276715819`) |
| Scope verification *(upstream — not this skill's job)* | Confluence **WEB UI and Elements Release Ticket Verification Guide** (page `4277207540`) |
| Version pairing | Confluence **Nuxeo Web UI LTS 2023 & 2025 Release mapping** (page `3523969324`) |

Reference files in this skill:

- `references/doc-repo.md` — **read before touching the docs repo.** It is a large public repo
  shared across all Nuxeo/Hyland documentation. Scope discipline, branch model, PR conventions,
  and the running log of surprises.
- `references/classification-rules.md` — what goes in, what stays out, which category
- `references/format-template.md` — page skeleton, frontmatter, layouts, index update
- `references/writing-and-accuracy.md` — voice, vocabulary, accuracy gates
- `references/published-patterns.md` — what 15 published releases actually look like
- `references/example-2025-18-0.md` — one release traced ticket by ticket

---

## Mode A — the per-ticket summary

1. **Read the ticket properly.** Fetch `summary`, `description`, `status`, `issuetype`,
   `priority`, `labels`, `components`, `resolution` **and `comment`**. The comments usually hold
   the real behaviour change; the title is the symptom as first reported, which is often not the
   same thing and sometimes plainly wrong.
2. **Find what a user would notice.** Open the linked PR(s) if the ticket text is thin. What
   could a customer do wrong or badly before, and what happens now?
3. **Write one sentence, two at most**, per `references/writing-and-accuracy.md`. Outcome first,
   mechanism second or not at all. No ticket keys, element names, stack traces, PR or branch
   references.
4. **Write it into Release Notes Summary** (`customfield_13954`), plain single-line text, via
   the Atlassian MCP `editJiraIssue` tool:

   - `cloudId` is `252cce86-035e-4b0e-abd2-3c002935632f` (site `hyland.atlassian.net`) — every
     Jira call needs it; `getAccessibleAtlassianResources` re-derives it if that ever changes.
   - `fields: { "customfield_13954": "<your sentence>" }`.
   - **Read the issue back** afterwards and confirm the field holds your text. A write that
     silently no-ops looks identical to success.
   - If `customfield_13954` errors as unknown, do not guess another id: fetch the field list
     (`getJiraIssueTypeMetaWithFields`, or the issue's `names` expansion) and match on the field
     *name* "Release Notes Summary". Hard-coded custom-field ids are the classic silent breakage.

   If the change needs more — a new `nuxeo.conf` property, a behaviour switch, an upgrade caveat
   — also fill **Release Notes Description** (`customfield_13943`).
5. Do not silently rewrite a summary a human already wrote. If it is inaccurate, say what is
   wrong and propose the correction.

---

## Mode B — the release page

### Step 1 — Work out which release you are writing

Do not ask the user for the version if they did not give one, and do not guess it. It is
deterministic.

```shell
# from the directory holding the nuxeo-web-ui and nuxeo-elements clones as siblings
"$SKILL/scripts/resolve-release.sh"            # or: … 2025.20.0   (either line's version)
```

`$SKILL` is this skill's own directory. **Both scripts live here, not in the repo you happen to
be standing in** — you will be inside `doc.nuxeo.com-content` for most of Mode B, so invoke them
by full path. Set it once:

```shell
SKILL=<repo>/.claude/skills/web-ui-release-notes     # or .cursor/… / .agents/… — same files
```

That prints both versions, the last stable tag per line, both page filenames, both
`tree_item_index` values and both docs branches, and fails loudly if the two repos disagree.
Run it rather than doing the arithmetic by hand. It reads `package.json` on each release branch
— the `<next>-SNAPSHOT` version there *is* the next release — and cross-checks the pair.

Then confirm it against Jira, which also gives you the planned release date:

```
project in (WEBUI, ELEMENTS) AND fixVersion in unreleasedVersions() ORDER BY project, key
```

The two lines must be a valid pair:

```
LTS 2025:  2025.N.0        LTS 2023:  3.1.(N+15)
```

Pairs confirmed **as of 2026-09** (this list grows every release and is not maintained here):
`2025.17.0 ↔ 3.1.32`, `2025.18.0 ↔ 3.1.33`, `2025.19.0 ↔ 3.1.34`, `2025.20.0 ↔ 3.1.35`. The +15
offset has held since 2025.3.0, but **the mapping page is authoritative** — read it rather than
trusting this list or the arithmetic.

**If `nuxeo-web-ui` and `nuxeo-elements` disagree on the version for the same line**, the
promotion/alignment cycle is mid-flight. Stop and report it; do not pick one.

Report back what you resolved before continuing: the two versions, the planned release date and
the ticket count per bucket. Report the counts as information, not as a gate — an uneven pair is
not yours to resolve (see *What this skill does not do*).

### Step 2 — Take the scope from the two buckets

```
project in (WEBUI, ELEMENTS) AND fixVersion = "2025.20.0" ORDER BY project, key
project in (WEBUI, ELEMENTS) AND fixVersion = "3.1.35"    ORDER BY project, key
```

That is the scope. Both buckets are always in scope, because one page covers both repos.

Take the **union** of the two buckets as the ticket list you must account for. A ticket that
appears in one bucket only is still written once and still appears on both pages — see *What
this skill does not do* above. Note it in the handover; do not act on it.

For each ticket fetch `summary`, `issuetype`, `status`, `resolution`, `components`, `assignee`,
`issuelinks` and the two release-notes fields (Step 3). That is everything you need: the notes are written
from the tickets, not from the code.

**The response will not fit in a tool result.** A real bucket is 45–50 tickets and returns
~160 KB, which overflows and gets spilled to a file. Expect that and work from the file with
`jq` rather than re-querying:

```shell
jq -r '.issues.nodes[] | [.key, .fields.status.name, (.fields.resolution.name//"-"),
        ((.fields.components//[])|map(.name)|join("/")),
        ((.fields.customfield_13954//"")|length|tostring), .fields.summary] | @tsv' <saved-file>
```

Ask for only the fields listed above — never `*all`.

### Step 3 — Collect the summaries, and fill the gaps yourself

Fetch `customfield_13954` (and `customfield_13943` where present) for every ticket in scope.

**What each field becomes on the page:**

| Field | Becomes |
|---|---|
| Release Notes Summary (`customfield_13954`) | the bullet — rewritten for the customer, never pasted through |
| Release Notes Description (`customfield_13943`) | the bullet's second sentence, or the `nuxeo.conf` fenced block, where it carries something the customer must act on. It is *not* published verbatim, and a page bullet never runs past two sentences — anything longer belongs in the feature documentation, not the notes |

The page is assembled from these fields, so **a ticket with an empty field is invisible** — that
is exactly how `WEBUI-2180` vanished from 2025.18.0 (see `references/example-2025-18-0.md`).

**By the time this skill runs, every ticket should already have a summary.** Chasing empty
fields belongs in the pre-release checklist, where the gap can be put to the people who
delivered the work. Treat authoring one as a **fallback**, not a normal step — and still report
every one you had to write, so the checklist gets tightened rather than the same gap recurring.

**Do Step 4's merge in your head first.** Roughly half the empty fields belong to a ticket that
is the sibling of one that already has a good summary (the same change filed once per repo), and
those need nothing written — they merge into the sibling's bullet. Author a summary only for a
change that is not already represented.

### Only resolved tickets are in the release

**A ticket that is not resolved is not in the release, whatever its `fixVersion` says.** Drop it,
per ticket — not per bullet, and never by reasoning from a sibling.

Keep a ticket only if **both** are true:

| | Requirement |
|---|---|
| Status | in the **done** category — `Resolved` / `Closed` |
| Resolution | a **delivering** one — `Done` or `Fixed` |

Everything else is excluded with its status as the stated reason in the Step 6 ledger:

- `Open`, `In QA`, `Ready for QA`, `In Progress` — **not merged**, so not in the release. A
  `fixVersion` gets added when work is planned, and it stays there whether or not the work lands.
- Closed with **no resolution**, or with `Won't Fix` / `Duplicate` / `Cannot Reproduce` /
  `Incomplete` — nothing shipped, so there is nothing to announce.

Two reasons this is strict rather than a judgement call:

1. **`fixVersion` is set by anyone, including other teams.** A ticket raised by another team, or
   one whose author set the version optimistically, sits in the bucket without having merged.
2. **This skill runs after code freeze.** Nothing unresolved *can* merge into the release after
   the freeze, so an unresolved ticket in the bucket is always a bucket-hygiene artefact — never
   work that is about to land.

**Do not rescue a bullet from a resolved sibling.** If the pair `WEBUI-nnnn` (resolved) +
`ELEMENTS-nnnn` (in QA) both describe one change, keep only what the **resolved** ticket's
evidence supports, and drop any detail that rests solely on the unresolved one. The resolved
ticket carries the bullet; the unresolved one contributes nothing to it.

Worked example, 2026-09-18 (2025.20.0): `ELEMENTS-2076` `Open`, `ELEMENTS-2006` `In QA` and
`ELEMENTS-2102` `Ready for QA` were all excluded. `ELEMENTS-2006`'s pair `WEBUI-482` was
`Resolved/Done`, so a bullet remained — but trimmed to the text-not-colour claim `WEBUI-482`
supports, dropping the form-level summary and ARIA detail that came only from `ELEMENTS-2006`.

If an unresolved ticket in the bucket looks like a mistake, say so in the handover. Getting the
`fixVersion` removed is release management, not yours.

When a field is empty on a ticket that **is** delivered and **is not** a merge sibling, **do not
skip it and do not stall**:

1. Run Mode A on it — read the ticket, its comments and its PR, and write the 1–2 line summary.
2. Write it into the ticket's Release Notes Summary field.
3. Include it in the release notes like any other ticket.
4. **Record it in the "authored by the agent" list.**

At the end you must hand the user that list explicitly, in this shape, so they can go back to the
people responsible and stop it recurring:

```
Tickets that had no Release Notes Summary — I wrote one and filled the field:

| Ticket | Component / owner | Summary I wrote |
|---|---|---|
| WEBUI-2180 | 3D, Addons | Fixed an issue where … |
```

**If you were asked for a rehearsal or dry run, do not write to Jira at all.** Draft the summary,
use it on the page, list it in the ledger, and say plainly in the handover that the field was not
filled. A rehearsal must not mutate other people's tickets.

Name the assignee or component owner where Jira gives you one, so the user knows whom to tell.
Flag it as a process gap, not a blocker: the release notes are complete either way, but the field
should have been filled by whoever delivered the ticket.

If a ticket genuinely has no customer-facing outcome, do not invent one — classify it as an
exclusion per `references/classification-rules.md` and say so in the ledger instead.

### Step 4 — Merge, classify and group

**One user-visible change is one bullet, however many tickets carry it — but only if it really
is one change.**

Find the candidates: tickets whose Release Notes Summary text is the same or nearly the same,
whose titles are the same sentence with the surface swapped ("Apply accessible text spacing to
*tags* / *form fields* / *document history filters*"), or that are joined by a Jira issue link
with both ends in the bucket (`Cloners`, `Relates`, `Split from/to`, `Dependency` are all used).
None of the three finds everything, so check all three — in 2025.20.0, `WEBUI-496` belongs to the
text-spacing bullet but is linked to none of its siblings.

Then decide on the **outcome**, not the relationship:

- **One outcome → one bullet.** The same change filed once per repo or per line, or split into
  "Part 1"/"Part 2". One sentence tells the whole story without losing anything.
- **Two outcomes → two bullets, even when the tickets are linked.** "Relates to" is a
  development relationship; it does not mean a customer experiences one improvement. Two
  independent fixes that happen to share a cause, a file or a sprint stay separate.
- **In doubt → keep them separate.** A missed merge costs a little redundancy. A wrong merge
  blurs two outcomes into one sentence and the customer stops recognising their own fix.
- **Never merge across the security boundary.** A ticket that folds into the single security
  sentence stays there; a behaviour fix keeps its own bullet. In 2025.20.0, `WEBUI-2227` relates
  to `WEBUI-2231` and `WEBUI-2232`, but those two are scanner configuration — merging on that
  link would pull scanner work into customer prose.

Then:

- **Classify** each merged item with `references/classification-rules.md`.
- **Group** into categories, most user-visible first, platform and security last.
- **Security and Sonar work collapses into a single sentence.** Never itemise CVEs, packages,
  versions or Sonar rules, and never use the words Sonar/SonarQube/Veracode in customer text.

### Step 5 — Write the two pages

Build both files exactly as `references/format-template.md` specifies: filename slug, frontmatter
(the `tree_item_index` formula and the `hidden` lifecycle), the handlebars multiexcerpt wrappers,
the `What’s New …` heading naming the right LTS line and version, and the trailing `<br/>`.

Pick the layout per `references/published-patterns.md`. The two pages are near-identical twins,
differing only in the heading's LTS line and version — 2025.18.0 and 3.1.33 are byte-identical
apart from that line.

Then lint them, before anyone reads them:

```shell
"$SKILL/scripts/lint-page.sh" <2025-page>.md <2023-page>.md
```

It checks every mechanical thing the review skill scores:

- frontmatter — all keys present, the empty `labels:`, quoted `review.date`, `title` and
  `description` matching the version, `hidden: true`, `tree_item_index` = `1001 −` the
  per-release segment;
- the filename slug against the version;
- both multiexcerpt wrappers, correctly spelled, ordered and closed, with `<br/>` inside;
- the `What’s New …` heading verbatim, including the **curly** apostrophe and the right LTS line;
- four-space nesting, no layout mixing, no legacy Era-2 prose-on-the-next-line, item titles
  ending in `:` inside `***…***`, balanced code fences;
- blank lines, trailing whitespace, tabs, the single final newline;
- leaked Jira keys, scanner names and CVE ids in customer prose;
- and it diffs the two bodies to enforce the twins rule.

**Get it clean before Step 8.** The docs repo has no CI and no markdown lint, so this script is
the only automated check that exists anywhere in the pipeline. `--released` inverts the `hidden`
expectation for the post-release flip commit.

**Lint what is committed, not the working tree.** The two pages live on two branches in one
clone, so a `git checkout` between them can leave one branch holding a stale copy while the
other is current — the twins check passes on the working tree and the divergence ships. This
happened on 2026-09-18. Either give each branch its own `git worktree`, or extract and compare
the committed files:

```shell
git show <2025-branch>:<path-to-2025-page> > /tmp/web-ui-release-notes-<2025-slug>.md
git show <2023-branch>:<path-to-2023-page> > /tmp/web-ui-release-notes-<2023-slug>.md
"$SKILL/scripts/lint-page.sh" /tmp/web-ui-release-notes-*.md
```

The safest way to keep the twins honest is to write one page, commit it, then **derive the other
from the committed copy** by substituting only `title`, `description`, `tree_item_index` and the
heading. A raw diff of the two committed files must then be exactly **8 lines** (four pairs).

### Step 6 — Coverage ledger (do not skip)

Account for **every** ticket from Step 2:

| Ticket(s) | Category | Bullet it became | Or exclusion reason | Summary authored by agent? |
|---|---|---|---|---|

Every ticket appears exactly once — mapped to a bullet, or excluded with a stated reason. If you
cannot account for a ticket, you are not finished. Show the ledger with the draft; it is what
makes the notes reviewable.

### Step 7 — Update the index page

On each branch, `src/nxdoc/web-ui/web-ui-release-notes.md` needs the "Recently Released Changes"
transclusion repointed at the new version, and the outgoing version moved into the **Previous
Release Notes** table. Details and the commented-row convention are in
`references/format-template.md`.

Check it with the linter — **once per branch**, since each branch has its own index:

```shell
"$SKILL/scripts/lint-page.sh" --index src/nxdoc/web-ui/web-ui-release-notes.md <page>.md
```

It confirms the transclusion is repointed, that the incoming version is not *also* sitting in the
Previous table, that the pre-staged commented row is in place, and that every row uses
`{{page page='…'}}` rather than a raw URL.

### Step 8 — Get it scored before you raise anything

**Hard gate.** The draft is scored out of 5 by the **`web-ui-release-notes-review`** skill on
accuracy, structure, language, customer framing and cross-line parity.

**Run it in a fresh subagent, not in your own context.** Its entire value is that it re-derives
the checks independently, and a reviewer who can already see your drafting reasoning is just you
holding a rubric. If no subagent capability is available in the session, say so plainly and ask
the user to run the review skill in a separate session — do not quietly self-review and report
the score as though it were independent. **Produce the Step 6 ledger before you submit.** A draft without it fails on hard failure 2
regardless of how good the prose is, because the reviewer cannot tell a deliberate exclusion from
a dropped ticket. Submit the ledger's path alongside the pages.

Hand the subagent only:

- the two page files and the index-page diffs,
- the version pair and the two bucket queries,
- the path to the review skill, and nothing else — no ledger, no rationale, no draft history.

Then:

- **Below 4.5 → do not open a PR.** Fix the findings and re-score.
- **Cap it at three rounds.** If it is still short after the third, stop looping: report the
  standing score, the findings you did not resolve and why, and hand the decision to the user.
  An unbounded loop over 0.10 formatting deductions converges on nothing.
- Re-run `lint-page.sh` after every fix and before resubmitting: fixes routinely introduce new
  formatting defects, and a review round should never be spent on a nit the script can catch.
- Report the final score and the fixes made along the way.

### Step 9 — Raise the PRs

Read `references/doc-repo.md` first. Summary of what matters:

- **Two PRs, one per line**: branch `2025` for the LTS 2025 page, branch `2023` for the LTS 2023
  page, both against `nuxeo/doc.nuxeo.com-content`.
- **Two NXDOC tickets**, one per line, usually consecutive ids (2025.17.0 → `NXDOC-2983`,
  3.1.32 → `NXDOC-2984`). Branch and PR title follow
  `NXDOC-<id>-Release-Notes-For-WebUI-<version-slug>`.
- Scope each PR to the release-notes paths only. This repo holds every Nuxeo/Hyland doc space;
  incidental edits elsewhere are a serious review problem.
- **Flip the *previous* version's page to `hidden: false` in this same PR.** Verified against
  the real history: the 2025.19.0 PR commit (`ab2cba8e`) added its own page with `hidden: true`
  **and** flipped `web-ui-release-notes-2025-18-0.md` from `true` to `false` in one commit, and
  2025.18.0's and 2025.17.0's PRs did the same for their predecessors. It has to work this way:
  this PR moves the outgoing version into **Previous Release Notes**, and that table would
  otherwise link to a page customers cannot see. So each release PR touches **three** files per
  branch: the new page (`hidden: true`), the outgoing page (`hidden: false`), and the index.
  Your change to the outgoing page is **one line**. Linting it with `--released` may report
  pre-existing defects in it — leave them alone. Scope discipline (`doc-repo.md`) beats tidiness,
  and cleaning up a published page inside a release-notes PR is exactly the kind of incidental
  edit reviewers challenge. 2025.19.0, for instance, carries a stray double blank line at
  line 149; it stays.
- **If no NXDOC ticket exists yet** — and it usually will not, since the Product Owner raises
  them close to release — say so rather than filing one uninvited, and do not invent an id. Ask
  whether to hold the PRs until the tickets exist, or to raise them now on a branch named
  `<something>-Release-Notes-For-WebUI-<version-slug>` with a placeholder prefix that is
  obviously not an NXDOC id, and rename once the ticket lands. Never guess the next id: they are
  allocated in pairs and a wrong guess collides with another team's ticket.

### Step 10 — Feed what you learned back into this skill

The docs repo is a **different repo** from the one this skill lives in, so nothing here is
enforced by its CI and conventions there can drift without warning. Treat every surprise as a
defect in this skill.

If, while writing or raising the PR, you hit anything not already documented here — a review
comment on the doc PR, a frontmatter key you had to add, a build or `npm run verify` failure, a
changed template convention, a new category name, a reviewer preference — then **in the same
session**:

1. Add the fact to the right reference file (repo mechanics → `references/doc-repo.md`, and log
   it in that file's **Surprises log** table with the date and what it cost).
2. Mirror the change into every tree the repo keeps in sync.

   **Edit `.cursor/skills/…` — it is the canonical tree** (see `.agents/skills/README.md`).
   `.agents/skills/…` is a plain copy of it, and **`.claude/skills/…` is a symlink into
   `.agents/`** — so an agent that edited the skill through `.claude/` has written into
   `.agents/`, and mirroring `.cursor` → `.agents` would delete those edits. Check where your
   edit actually landed before running this:

   ```shell
   set -euo pipefail
   cd "$(git rev-parse --show-toplevel)"
   src=.cursor/skills/web-ui-release-notes          # canonical
   dst=.agents/skills/web-ui-release-notes          # plain copy; .claude/ symlinks here

   # If you edited via .claude/ (i.e. in $dst), swap src and dst before this line.
   rsync -a --delete "$src/" "$dst/"
   diff -r "$src" "$dst" && echo in-sync
   ```

   `rsync --delete` rather than `rm -rf` + `cp -R`: it is idempotent, it never leaves the
   destination missing, and a failed `cd` cannot turn it into a destructive command.

3. **Check the skill is still visible to Claude Code.** The `.claude/skills/` symlink farm is
   regenerated from the **git-tracked** skills, so while this skill is untracked its symlinks
   are dropped on every regeneration and the skill silently stops loading. Observed 2026-09-18:
   both release-notes symlinks vanished mid-session. Re-link, and commit the skill to make it
   stick:

   ```shell
   for s in web-ui-release-notes web-ui-release-notes-review; do
     [ -e ".claude/skills/$s" ] || ln -s "../../.agents/skills/$s" ".claude/skills/$s"
   done
   ```

4. Tell the user what you changed and why, so the next run does not pay the same cost.

### Step 11 — After publication

Check the live page renders, the new version appears in the left-hand navigation, and the index
page shows the release. Publication lags by a few hours, so do not promise a live link before it
resolves. The release checklist expects the notes PRs merged in **Phase 5.3 (Wrap up)**.

---

## Guardrails

- **Never invent a change.** If no ticket supports a sentence, delete the sentence. Writing a
  missing *summary* from real ticket evidence (Step 3) is not inventing; writing a bullet with no
  ticket behind it is.
- **Never publish before the release ships.** New pages land with `hidden: true`.
- **No internal identifiers in the prose** — no Jira keys, PR numbers, branch names, element
  names, file paths, CSS variables, scanner names or CVE ids. A `nuxeo.conf` property is the one
  legitimate exception.
- **The two pages never differ in content.** Same codebase, same set of changes. An uneven pair
  of buckets is never a reason to write different notes per line: write the change once, put it
  on both pages, and note the unevenness in the handover.
- **Do not restate the ticket title.** The title is the bug as reported; the note is the outcome
  as delivered.
- **The docs repo is public and shared across all of Nuxeo/Hyland documentation.** Nothing
  customer-confidential, nothing internal-only, and no edits outside the release-notes paths.
- **Ask before writing to Jira or opening PRs on someone else's ticket.** Filling an empty
  Release Notes Summary during a release you were asked to write is in scope; transitioning
  tickets, editing someone's existing summary, or filing new tickets is not.
- **Always produce the draft.** This skill's output is two pages and a ledger. Anything odd
  about the buckets is reported alongside them, never instead of them.
