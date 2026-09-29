# The docs repository — `nuxeo/doc.nuxeo.com-content`

Read this before touching it. It is **not** the Web UI repo, it is **public**, and it is
**shared by every Nuxeo/Hyland documentation area**. A careless PR here is visible to customers
and lands in other teams' territory.

## What it is

| Fact | Value |
|---|---|
| Repo | `nuxeo/doc.nuxeo.com-content` — **public** |
| Size | ~235 MB of content |
| Default branch | `master` |
| Content roots | `src/nxdoc` (product/developer/admin docs), `src/userdoc` (end-user docs) |
| `src/nxdoc` areas | `client-sdks`, `contributing-to-nuxeo`, `dam`, `getting-started`, `nuxeo-add-ons`, `nuxeo-server`, `nuxeo-tools`, `web-ui` |
| Our slice | `src/nxdoc/web-ui/**` only |
| Site generator | Metalsmith, via the `nuxeo-docs-builder` package |
| Site config | `config.yml` (YAML-linted by the `pretest` hook) |
| Formatting config | `.prettierrc` — `singleQuote: true`, `printWidth: 120` |
| PR automation | **none** — no `.github/workflows`, no CODEOWNERS, no markdown lint |

### Branch model

Long-lived branches are **documentation versions**, not git-flow branches:

`master`, `2025`, `2023`, `2021`, `1010`, `910`, `810`, `710`, `60`, `58`

- LTS 2025 pages live on branch **`2025`**. LTS 2023 pages live on branch **`2023`**.
- **Never merge one version branch into another.** Equivalent content is written or cherry-picked
  per branch. The two release-notes pages for a release are twins on two branches, produced by
  two separate PRs.
- Work happens on a short feature branch cut from the version branch and PR'd back into it.
  Most of the repo names it `NXDOC-<id>-<slug>`; **release-notes branches deliberately do not**
  — see the naming rule below.

### How our PRs actually look

Real merged examples, most recent first:

| Branch / PR title | Into | PR |
|---|---|---|
| title `NXDOC-3030-Release-Notes-For-WebUI-2025.21.0` (branch `NXDOC-PENDING-…`, superseded) | `2025` | #2850 |
| title `NXDOC-3031-Release-Notes-For-WebUI-3-1-36` (branch `NXDOC-PENDING-…`, superseded) | `2023` | #2851 |
| `NXDOC-3007-Release-Notes-For-WebUI-2025.19.0` | `2025` | #2819 |
| `NXDOC-3008-Release-Notes-For-WebUI-3-1-34_Update` | `2023` | #2823 |
| `NXDOC-2991-Release-Notes-For-WebUI-2025.18.0` | `2025` | #2792 |
| `NXDOC-2992-Release-Notes-For-WebUI-3-1-33-Update` | `2023` | #2793 |
| `NXDOC-2983-Release-Notes--For-WebUI-2025.17.0` | `2025` | #2767 |
| `NXDOC-2984-Release-Notes-WebUI-3-1-32` | `2023` | #2768 |

Points to take from that:

- **Two NXDOC tickets per release, one per line, ids consecutive** — `2983`/`2984`,
  `2991`/`2992`, `3007`/`3008`, `3030`/`3031`, LTS 2025 taking the lower id. You file them
  yourself, *after* the PRs, per `SKILL.md` Step 10 — but search first, because the Product
  Owner sometimes raises them ahead of time in their own wording (`Release notes for WebUI
  2025.20.0` → `NXDOC-3027`), and a duplicate pair is worse than a late one.
- **Two summary styles exist.** A ticket the PO raised first reads `Release notes for WEBUI
  <version>`; one filed after the PR reads `Release-Notes-For-WebUI-<version-slug>- #<pr>`, with
  the PR number, and repeats that string as an H1 description. Step 10 writes the second form.
- **Branch `webui-release-notes-<version-slug>`, title `NXDOC-<id>-Release-Notes-For-WebUI-<version-slug>`.**
  The branch carries no id: it cannot, since the ticket is filed after the PR, and a branch that
  never claims an id never has to be renamed — renaming it from the CLI means pushing the new
  name and deleting the old, which closes the PR. Open the PR titled
  `Release-Notes-For-WebUI-<version-slug>` and let Step 10 prepend the id. Earlier PRs used an
  `NXDOC-PENDING-…` branch (#2850, #2851) or a real id in the branch; leave those as they are.
- The version slug is inconsistent in history (`2025.17.0`, `2025-15-0`, `3-1-32`). Use dots for
  the 2025 line and dashes for the 3.1 line — `2025.21.0` and `3-1-36` — in both the branch and
  the title, so one release has one spelling. Do not "correct" an existing branch name.
- Duplicate/retried branches (`…-02`, `…-N`) exist because these PRs do get reworked after
  review. Expect review comments.

## Working locally

```shell
# Use gh (HTTPS) — a plain SSH clone fails where no SSH agent/key is available.
gh repo clone nuxeo/doc.nuxeo.com-content docs -- --depth 1 --branch 2025 --no-single-branch
cd docs
git fetch --depth 1 origin 2023:2023      # the second version branch, shallow
git checkout 2025          # or 2023
git checkout -b webui-release-notes-<version-slug>     # no NXDOC id — see the naming rule above
```

Optional local preview — heavy, and rarely worth it for a release-notes page:

```shell
npm install
npm run dev                # metalsmith dev server
LIMIT=1 FILTER=web-ui npm start   # narrow the build; a full build is slow
```

**`npm run verify` is a smoke test, not a content linter.** It only asserts that `site/`,
`site/assets/` and `site/nxdoc/` were generated. It will not catch a broken multiexcerpt, a wrong
`tree_item_index`, bad indentation or a typo. Since there is no CI either, **nothing but human
review stands between your draft and the published page** — which is why the
`web-ui-release-notes-review` skill gate exists.

## Scope discipline

- **Touch only** `src/nxdoc/web-ui/web-ui-release-notes/…` and
  `src/nxdoc/web-ui/web-ui-release-notes.md`.
- **Do not run Prettier or a formatter across the repo.** The config exists but the content is
  not uniformly formatted; a repo-wide run produces a monstrous diff across other teams' docs.
  Format your own two files by hand, to match their neighbours.
- **Do not rename or restructure multiexcerpts.** Content is transcluded across pages and spaces
  with `{{{multiexcerpt 'name' page='page'}}}`. Renaming one silently blanks a section on a page
  you never opened.
- **Do not fix unrelated content you happen to notice.** File it, mention it, move on. An
  in-passing edit to `nuxeo-server` or `dam` in a Web UI release-notes PR will and should be
  questioned.
- **Nothing confidential.** The repo is public. No customer names, no internal ticket detail, no
  support-case content, no unreleased roadmap.
- Documentation-wide conventions live under `src/nxdoc/contributing-to-nuxeo` — consult it before
  inventing a convention.

## Conventions learned the hard way

These are **rules**, not history. Each one cost somebody time once; it is written here so it
costs nobody time again.

**The issue history does not live here.** When something goes wrong, the *narrative* — what
happened, why, and what was decided — goes to the Confluence **Web UI Release Notes — Feedback &
Lessons Log** (page `4309167086`). Only the resulting rule comes back into this file. Keeping
incident notes in two places is how a register stops being trusted; see `SKILL.md` Step 12.

| Convention | What to do |
|---|---|
| The frontmatter carries an **empty** `labels:` key above `tree_item_index` | Keep it; do not "tidy" it away |
| `## What’s New …` uses a **curly** apostrophe | Copy the heading, do not retype it |
| `npm run verify` passes even when the content is broken | Never treat a green local build as validation |
| `git clone git@github.com:…` fails where no SSH key is available | Clone with `gh repo clone` over HTTPS; shallow, then fetch the second branch |
| The index table has a `\| Version \| Summary \|` header **and** a separator row | Keep them; add the new row below the separator |
| The `2023` branch index has a `---` rule after the transclusion and writes the commented row as `\|-->`; the `2025` branch has neither | Match each branch's own local convention; do not normalise across branches |
| The `hidden: false` flip for the outgoing version happens **inside the next release's PR**, same commit | Every release PR touches three files per branch: new page `true`, outgoing page `false`, index |
| One clone plus two branches lets a stale page get committed on one branch while its twin is current | Lint the **committed** files, or use one `git worktree` per branch (`SKILL.md` Step 5) |
| The NXDOC ticket cannot be filed before its PR, because its summary carries the PR number | Raise the PR on `webui-release-notes-<version-slug>`, file the ticket (`SKILL.md` Step 10), then rewrite only the PR title |
| Re-pointing an open PR at a renamed branch from the CLI (push new, delete old) closes the PR | Keep the id out of the branch entirely: `webui-release-notes-<version-slug>` needs no rename |
| A bucket query returns ~160 KB and overflows the tool result | Request only the needed fields and read the spilled file with `jq` (`SKILL.md` Step 2) |
| `lint-page.sh` validates the **filename slug**, so extracting a committed page to `/tmp/page.md` fails three unrelated checks | Extract each file under its real name into its own directory — `/tmp/<x>/a/web-ui-release-notes-2025-N-0.md`, `/tmp/<x>/b/web-ui-release-notes-3-1-Z.md`, and the index as `web-ui-release-notes.md` beside each |
| The ledger quotes page bullets, so a review fix round silently makes the quotations stale | After every fix round, re-check each quoted bullet against the **committed** page before resubmitting. Truncate long quotations with `…` and compare on the prefix |
| Formatting is reviewed strictly on the real PRs | Run `lint-page.sh` and the review gate before pushing, not after |
