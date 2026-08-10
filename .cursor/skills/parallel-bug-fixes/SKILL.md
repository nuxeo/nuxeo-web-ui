---
name: parallel-bug-fixes
description: >-
  Fan out several Nuxeo Web UI bug fixes at once — one agent per ticket, each in
  its own isolated workspace — and drive the single-ticket
  `fix-nuxeo-web-ui-bug` skill inside each of them. Resolves an epic's children
  via JQL (`parent = <EPIC>`) or takes an explicit ticket list, creates a
  per-ticket clone / `nuxeo-elements` clone / `node_modules` / container name /
  host port / build dirs with `scripts/new-ticket-workspace.sh`, hands each child
  agent its `$NX_*` overrides, batches the run into waves that fit the machine's
  Docker memory budget, then reports per-ticket outcome and PR links. Use when
  asked to "fix all children of <epic>", "run multiple bug fixes at once", "one
  agent per ticket", "work on these tickets in parallel", or to plan capacity for
  a batch of WEBUI-/ELEMENTS- tickets.
---

# Run several Nuxeo Web UI bug fixes in parallel

This skill is the **orchestrator for a batch**. It does not know how to fix a bug — that is the
[`fix-nuxeo-web-ui-bug`](../fix-nuxeo-web-ui-bug/SKILL.md) skill, which is deliberately written for
**one ticket at a time**. Your job is to turn a list of tickets into N isolated runs of that skill,
one agent per ticket, and to keep those runs from colliding.

Everything the single-ticket skill hard-codes for a solo run — port `8090`, container `nx-<ticket>`,
`/tmp/dist-*`, `~/Desktop/<TICKET-ID>` — becomes a per-run variable here. The override list is in
[The `$NX_*` contract](#the-nx_-contract) and you must pass it to every child agent.

## Phase A — Resolve the ticket list

Take either form of input:
- **A Jira epic key.** Resolve its children with `searchJiraIssuesUsingJql`, JQL `parent = <EPIC>`
  (cloudId `252cce86-035e-4b0e-abd2-3c002935632f`). Ask for `key,summary,fixVersions,status,issuetype`
  so you can triage before spending a workspace on anything.
- **An explicit ticket list** (`WEBUI-2170 WEBUI-2149 ELEMENTS-1611`). Still fetch each issue —
  `fixVersions` and the target repo decide how many workspaces the ticket needs.

Then **triage before fanning out** (see [Triage caveats](#triage-caveats-for-epic-children) — this is
where a batch quietly doubles in size or aims a client fix at a server bug).

**Exit gate:** you have a table of ticket → target repo → base branch(es) → in/out of scope, and a
workspace count that matches it. Do not start any agent while a row still says "bases unknown".

## Phase B — Plan the waves (capacity is the binding constraint)

These numbers are **measured on this machine**, not estimates. Treat them as hard planning
constraints:

| Resource | Measured | Consequence |
|---|---|---|
| Docker Desktop memory | capped at **7.7 GB**; one Nuxeo container ≈ **1.2 GB**; one already running | **~4–5 concurrent repro containers, maximum** |
| Workspace creation | ~25s for one; **6 concurrent took 3m47s** | I/O bound — stagger starts, don't launch together |
| Disk | 6 workspaces moved `df` used by ~0 | free: `--local` hardlinks objects, `cp -Rc` is APFS copy-on-write |
| CPU / RAM | 16 CPUs / 64 GB | Puppeteer video capture is CPU-heavy — another reason to cap |

So **batch the tickets into waves of 4–5 and run the waves in sequence.** Launching 25 agents at once
does not go faster; it runs out of Docker memory and every repro fails at container start.

Agents **cannot share one container.** The A/B step in Phase 2 of the single-ticket skill deploys a
build into the container's `nxserver/nuxeo.war/ui` directory, so two tickets sharing a container
would overwrite each other's bundles and capture each other's evidence. One container per run, no
exceptions. Raising Docker Desktop's memory allocation is the only way to widen the limit — if the
user wants more concurrency, that is the ask.

Stagger workspace creation too: create them a few seconds apart rather than firing off the whole
wave, since the cost is disk I/O, not CPU.

**Exit gate:** you can state the wave plan as "wave 1: these N tickets; wave 2: …", with N ≤ 5, and
`docker ps` shows how much of the memory budget is already spoken for.

## Phase C — Create one isolated workspace per (ticket, base)

One command per ticket and base:

```bash
bash .cursor/skills/parallel-bug-fixes/scripts/new-ticket-workspace.sh <TICKET-ID> lts-2025
bash .cursor/skills/parallel-bug-fixes/scripts/new-ticket-workspace.sh <TICKET-ID> maintenance-3.1.x
```

Each workspace is a full clone with its own `nuxeo-elements` clone, `node_modules`, Docker container
name, host port, build dirs and evidence folder — nothing shared. Layout:

```
WebUI/
  nuxeo-web-ui/                      # reference clone — agents never write here
  nuxeo-elements/                    # reference clone
  tickets/WEBUI-2170/lts-2025/       # web-ui/ + elements/ + env.sh
  tickets/WEBUI-2170/maintenance-3.1.x/
```

Override the location with `NX_TICKETS_ROOT`, but keep it **outside** the repo — a nested workspace
becomes untracked content that `git status`, eslint and `prettier --list-different` all walk into.
Re-running for an existing workspace is a no-op that just re-prints the environment. If a previous
run was killed mid-provision (the clones are there but `env.sh`, which is written last, is not), the
re-run **recovers automatically** — it discards the half-built workspace and rebuilds it, unless that
clone has uncommitted changes or commits that are not on `origin/<base>`, in which case it refuses and
asks you to inspect it or pass `--force`.

`maintenance-3.0.x` is **deprecated**: the script rejects it outright, so only `lts-2025` and
`maintenance-3.1.x` are valid bases.

**Why a shared checkout cannot work.** One working tree holds one branch, so two agents in the same
checkout fight over `HEAD`. A `git worktree` is not enough either: a clone shares its refs, its config
and its **stash stack** with every one of its worktrees, so one run's `git stash` can be popped by
another, and a branch created in one is visible (and deletable) from the others. Separate clones are
what actually isolates.

The script also **repoints the `@nuxeo/*` dev symlinks at that ticket's own `nuxeo-elements` clone,
by absolute path.** The checked-in links are relative (`../../../nuxeo-elements/core`) and resolve to
the one shared elements checkout from any depth, which silently makes agents build and test each
other's elements branch.

Then, in the child agent: **move its root to the workspace** and source the environment before
anything else.

```bash
move_agent_to_root  ->  $NX_WT
. <tickets-root>/<TICKET-ID>/<base>/env.sh
cd "$NX_WT"
```

**Exit gate:** for every ticket in the wave, `env.sh` exists, its `NX_PORT` is unique across all
`env.sh` files under the tickets root, and `NX_CONTAINER` does not clash with anything in
`docker ps -a`.

## The `$NX_*` contract

The single-ticket skill keeps literal placeholders on purpose (it is correct for a solo run). A child
agent driven by this skill **must override every one of them**. State this list verbatim in the
prompt you give each agent:

| Use this | Instead of the core skill's | Where |
|---|---|---|
| `$NX_WT` | the current checkout | every command; assert before any git write |
| `$NX_PORT` | `8090` | `docker run -p "$NX_PORT":8080` |
| `$NX_CONTAINER` | `nx-<ticket>` | every `docker` invocation |
| `$NX_URL` | `http://localhost:8090/nuxeo` | `curl` / `page.goto` |
| `$NX_DIST_PATCHED` | `/tmp/dist-<ticket>-patched` | Phase 2 A/B build |
| `$NX_DIST_UNPATCHED` | `/tmp/dist-<ticket>-unpatched` | Phase 2 A/B build |
| `$NX_EVIDENCE` | `~/Desktop/<TICKET-ID>` | screenshots, videos, repro dir |

`NX_BASE` and `NX_ELEMENTS` come from the same `env.sh`; use `origin/$NX_BASE` where the core skill
writes `origin/<base>`, and build the baseline worktree inside `$NX_WT/..` rather than a shared
`/tmp/baseline-<ticket>`.

## Guardrails for child agents (state these in every prompt)

- **Work only inside your own `$NX_WT`.** Before any git write:
  ```bash
  [ "$(git rev-parse --show-toplevel)" = "$NX_WT" ] || { echo "WRONG WORKSPACE"; exit 1; }
  ```
- **Never `git stash`.** The stack is shared across a clone's worktrees and is trivially stranded
  when a run is interrupted. Use a throwaway `git worktree add --detach` of the base when you need a
  clean tree (the core skill's Phase 2 already does this).
- **Never touch another ticket's workspace, another agent's container, or the shared reference
  clones** (`nuxeo-web-ui`, `nuxeo-elements`). Another agent is mid-run there.
- **Only remove your own `$NX_CONTAINER`.** Never `docker rm` by pattern, and never disturb the live
  instance (often `nuxeo` on port 8080).
- **Never hard-code a port, container name or build dir** — that is what the `$NX_*` contract is for.

## Port allocation

The script picks a deterministic starting port so re-runs for the same ticket tend to reuse the same
one, and the two bases of a ticket never collide:

```
PORT_START = 8100 + (<ticket-number> % 250) * 3 + <base-offset>    # lts-2025 0, 3.1.x 1
```

The stride is 3 with only two bases in use, so every ticket has a spare slot — harmless, and it keeps
the derived ports stable for workspaces created before `maintenance-3.0.x` was dropped.

From there it scans upward for a port that is both **genuinely free** (a real `bind`) and
**unclaimed** by a sibling workspace's `env.sh` — a container that has not started yet still owns its
port, so listening-socket checks alone are not enough.

The `% 250` fold means **real collisions do occur**: `WEBUI-899` and `WEBUI-2149` both derive `8547`.
The whole allocate-and-record section therefore runs under an atomic `mkdir` lock
(`<tickets-root>/.port.lock`, with a 2-minute stale-lock reap), because two runs starting in the same
second would otherwise both see the port as unclaimed and both take it. Keep the lock — it is the
only thing making simultaneous starts safe.

## Skills overlay (temporary — while the bases are behind)

`lts-2025` and `maintenance-3.1.x` still track an **older** copy of these skills, so a fresh clone of
a base would hand stale instructions to the agent working in it. The script therefore copies the
current `.cursor/skills/` into each workspace and hides it from git:

- tracked paths → `git update-index --skip-worktree`
- paths the base does not have at all → the clone's `.git/info/exclude`

Result: `git status` stays clean in the workspace and the overlay **cannot** reach a fix PR. The
script verifies this and warns if the overlay is still visible to git.

**Caveat:** a cherry-pick that touches `.cursor/skills` needs
`git update-index --no-skip-worktree <paths>` in that workspace first, otherwise the pick silently
skips those files.

Also **symlink the skills into your personal folder** so an agent reads the current instructions
*before* any workspace exists:

```bash
mkdir -p ~/.cursor/skills
ln -s "$PWD/.cursor/skills/parallel-bug-fixes"   ~/.cursor/skills/parallel-bug-fixes
ln -s "$PWD/.cursor/skills/fix-nuxeo-web-ui-bug" ~/.cursor/skills/fix-nuxeo-web-ui-bug
```

Drop the symlinks and the overlay step once the skills are current on both bases.

## Phase D — Fan out, one agent per ticket

Launch **one agent per ticket** (not per base — a single agent owns both bases of its ticket, using
the two workspaces the script created). Give each agent:

1. its ticket id and a one-line statement of the symptom;
2. the **explicit base branch(es)** it must target (never "both, figure it out" — see the
   `fixVersions` caveat below);
3. its workspace path(s), and the instruction to `move_agent_to_root` there and `. env.sh` first;
4. the [`$NX_*` override list](#the-nx_-contract), verbatim;
5. the [guardrails](#guardrails-for-child-agents-state-these-in-every-prompt), verbatim;
6. the instruction to follow [`fix-nuxeo-web-ui-bug`](../fix-nuxeo-web-ui-bug/SKILL.md) end-to-end,
   including its own Phase 11 verification sweep.

Do not merge, review or push on a child's behalf — each run owns its own PRs. Your remaining job is
to hold the wave size and collect results.

## Phase E — Report

One consolidated report for the batch, one row per ticket: outcome (fixed / not reproducible / routed
to backend / out of scope), the PR links per base, CI state of the gating checks, and the evidence
folder. Call out explicitly:

- tickets that were **not** attempted, and why (wave capacity, wrong repo, needs backend);
- tickets whose bases you had to decide because `fixVersions` was empty;
- any workspace left standing (and therefore still holding a port and a container).

**Exit gate:** every ticket from Phase A appears in the report with an outcome. A ticket you launched
and never heard back from is not "done", it is unfinished.

## Triage caveats for epic children

These are the three things that actually go wrong when you point this skill at an epic:

- **Empty `fixVersions` doubles the batch.** Most children of `NXENG-518` have **no** `fixVersions`,
  and the core skill's rule is "every fix ships on **both** bases". An agent handed an empty
  `fixVersions` therefore targets `lts-2025` *and* `maintenance-3.1.x` — 2 workspaces and 2 PRs per
  ticket, i.e. **50 workspaces for 25 tickets**. Resolve `fixVersions` per ticket (or state the
  intended bases explicitly in each agent's prompt) **before** fanning out.
- **`ELEMENTS-*` children live in a different repo.** e.g. `ELEMENTS-1611` lands in
  **`nuxeo/nuxeo-elements`**, not `nuxeo-web-ui`, and its fixVersions are named differently — a
  `3.x` line rather than `lts-2025` / `maintenance-3.1.x`. Only the **`3.1.x`** line is in scope;
  **`3.0.x` is deprecated**, so ignore that fixVersion rather than opening a branch for it. The
  script clones elements per ticket, so isolation still holds, but the branch naming, PR target repo
  and backport pair all differ — say so in the agent's prompt instead of letting it assume
  `nuxeo-web-ui`.
- **Not every a11y child is a client-side bug with a minimal fix.** "PDF Documents: No accessibility
  tags on export" and "Integrated Video Player: no captions" need backend or third-party work, not a
  Web UI patch. Route those to [`jira/raise-backend-jira-ticket`](../jira/raise-backend-jira-ticket/SKILL.md)
  rather than burning a workspace forcing a client fix. Decide this in Phase A, on the ticket text.

## Phase F — Teardown

Per ticket and base, once its PRs are open and its evidence is attached:

```bash
bash .cursor/skills/parallel-bug-fixes/scripts/new-ticket-workspace.sh <TICKET-ID> <base> --remove
```

It removes that run's container, build dirs and workspace, **keeps the evidence folder**, and
**refuses to delete uncommitted work** (`--force` overrides, so only use it once you have checked
`git status` in that workspace). Tear down before starting the next wave — that is what frees the
Docker memory the next wave needs.
