---
name: raise-backend-jira-ticket
description: >-
  Create a backend Jira ticket in the NXP ("Nuxeo Platform") project — the
  "NPX board" — tagged `nxplatform`, for work that a nuxeo-web-ui ticket
  cannot fix on the client alone (a missing/changed REST endpoint, Automation
  operation, adapter, or other server-side capability). Fills in proper issue
  details, recommends the concrete backend solution that works for the Web UI,
  and links the source (given input) ticket so it is "blocked by" the new NXP
  ticket. Use when a WEBUI-/ELEMENTS- ticket needs a backend change, when asked
  to "raise/create a backend ticket", "file an NXP/nxplatform ticket", or
  "recommend the backend team" for a server-side gap.
---

# Raise a backend (NXP / nxplatform) Jira ticket

Use this when analysing a Web UI ticket reveals the real fix (or part of it) must happen on the
**server** — a REST endpoint that doesn't return the needed data, a missing Automation operation, a
document adapter/enricher gap, a permissions/security check, etc. This skill files that backend work
on the platform board, recommends the solution the Web UI needs, and wires up the dependency so the
UI ticket is visibly blocked by it.

Run it autonomously end-to-end (draft → create → link → cross-reference → report). The only thing
that isn't fully automatable is the issue **link** and (optionally) the cross-reference comment when
no API token is available — see Phase 4.

## Constants
- Atlassian cloudId: `252cce86-035e-4b0e-abd2-3c002935632f` (site `hyland.atlassian.net`)
- Target project: **`NXP`** — *Nuxeo Platform* (this is the "NPX board")
- Required **Tags**: **`nxplatform`** (always add it; add `web-ui` too so the origin is searchable).
  On this site "Tags" is a **custom labels-type field `customfield_13956`** — NOT the built-in
  `labels` field. Set `customfield_13956` or the tag won't show up on the board.
- Required **Component**: NXP rejects creation without one (`"Components is required"`). Pick the
  closest match to the affected server module — e.g. `User Profile / User Manager` (id `18042`) for
  `nuxeo-platform-usermanager`, `Directory`, `Security / Rights`, `Authentication`, etc. If unsure,
  list options with `getJiraIssueTypeMetaWithFields` (project `NXP`, Bug issueTypeId `10004`,
  `requiredFieldsOnly:false`) and read the `components` field's `allowedValues`.
- Default issue type: **`Bug`** for a defect that needs a server fix; **`Improvement`** or
  **`New Feature`** when the UI needs a *new* server capability (new field/endpoint/operation).
  Valid NXP types: Epic, Story, Task, Sub-task, Bug, Improvement, New Feature, Clean up, Question, Discovery.
- Link type: **`Blocks`** (outward `blocks` / inward `is blocked by`).
- If Atlassian tools aren't listed, call `mcp_auth` for the `plugin-atlassian-atlassian` server first.

## Input
The "given input" is the source ticket (e.g. `WEBUI-411`) — pass its key. If only a free-text
description of the backend gap is given, still capture which UI ticket it came from so the block link
can be created; if there is genuinely no source ticket, skip the link (Phase 4) and say so.

## Phase 1 — Understand the gap
- `getJiraIssue` (cloudId above, `issueIdOrKey=<input>`, `fields:["*all"]` incl. `comment`). Read the
  description **and every comment** to pin down exactly what the client can't do and why.
- Identify the **specific** server-side gap: which REST endpoint / Automation operation / adapter /
  page-provider / property is missing or wrong, and what the UI needs it to return or accept.
- Confirm it truly can't be solved client-side (no existing endpoint/operation, enricher, or header
  already provides it). Only file backend work when the client genuinely can't.

## Phase 2 — Draft the ticket
Write a self-contained ticket a platform engineer can action without the UI context. Use the
**title** and **description** templates below. The **Recommended solution** section is required —
propose the concrete change that works for the Web UI (endpoint shape, new operation + params,
adapter field, response payload), not just "please fix". Offer a primary recommendation and, if
relevant, one acceptable alternative.

## Phase 3 — Create the issue (MCP)
`createJiraIssue`:
- `cloudId` = constant, `projectKey` = `NXP`, `issueTypeName` = default `Bug` (see Constants),
  `summary` = the drafted title, `description` = the drafted body, `contentFormat` = `markdown`.
- Tags **and** the required component go through `additional_fields` (the only way to set custom
  fields / components / priority). The **Tags** field is `customfield_13956` (a labels-type custom
  field) — setting the built-in `labels` alone leaves the board's Tags empty:
```json
{ "customfield_13956": ["nxplatform", "web-ui"], "components": [{ "id": "18042" }] }
```
  (`18042` = `User Profile / User Manager`; swap for the component that fits the module — see
  Constants. Optionally also set `"labels": ["nxplatform", "web-ui"]` for extra searchability.)
- Capture the returned key (e.g. `NXP-1234`) and browse URL: `https://hyland.atlassian.net/browse/NXP-1234`.
  If creation fails with `"Components is required"`, you omitted the component — add it and retry.

## Phase 4 — Link the input as "blocked by" the new ticket
The source (given input) ticket must end up showing **"is blocked by → NXP-new"** (equivalently, the
new NXP ticket **blocks** the input).

The Atlassian MCP now exposes **`createIssueLink`** — use it (no REST/curl or token needed).
⚠️ Its inward/outward semantics are **inverted vs raw REST**: per the tool's own description,
`inwardIssue` = the **blocker**, `outwardIssue` = the **blocked** issue. So:
- `type` = `Blocks`
- `inwardIssue` = the **new NXP** ticket (the blocker)
- `outwardIssue` = the **given input** ticket (the blocked one)

```json
{ "cloudId": "…", "type": "Blocks", "inwardIssue": "NXP-1234", "outwardIssue": "WEBUI-411" }
```
Then **verify** with `getJiraIssue` on the input (`fields:["issuelinks"]`): the link should read
`type: Blocks` with the NXP ticket as `inwardIssue` and `inward: "is blocked by"` — i.e. the input
*is blocked by* NXP. Use `getIssueLinkTypes` first if the `Blocks` name is uncertain.

Fallback (only if `createIssueLink` is unavailable): create the link via the Jira REST `issueLink`
endpoint (note REST uses the opposite convention — `outwardIssue` *blocks* `inwardIssue`), or link
manually in the browser: **Link → is blocked by → NXP-1234** on the input ticket.

## Phase 5 — Cross-reference (recommended)
Comment on the **input** ticket via `addCommentToJiraIssue` (cloudId, `contentFormat:"markdown"`)
noting the backend dependency was filed and linked — e.g. *"A backend change is required; raised
`NXP-1234` (nxplatform) and linked it as **is blocked by**. This UI ticket is blocked until that
lands."* Keep it honest: only say "linked" once Phase 4 actually succeeded.

## Phase 6 — Report
Output: the new `NXP-<id>` key + browse URL, the issue type, component, and tags set
(`customfield_13956`), and the link status (created via `createIssueLink` and verified / manual
fallback). If the link couldn't be created automatically, say so explicitly.

---

## Title template
```
[Web UI] <concise capability the UI needs> (blocks <INPUT>)
```
Examples:
- `[Web UI] Expose "canEdit" flag on document REST enrichers (blocks WEBUI-411)`
- `[Web UI] Add Automation op to bulk-update retention (blocks WEBUI-1987)`

## Description template (markdown)
```markdown
## Context
Raised from **<INPUT>** (<input link>). The Web UI cannot resolve this on the client alone; a
server-side change is required.

## Problem
<What the client is trying to do and the exact server-side limitation blocking it — the endpoint /
operation / adapter / property involved and what it currently returns or lacks.>

## Why a backend change is needed
<Why this can't be done in nuxeo-web-ui / nuxeo-elements: no existing endpoint or operation provides
the data/behaviour; the missing piece is server-side.>

## Recommended solution (what works for the Web UI)
<Concrete, actionable proposal:
- REST: endpoint + method + request/response shape the UI needs, or the field/enricher to add.
- Automation: new operation id + params + return, or the change to an existing one.
- Adapter/enricher/property: what to expose and where.
Give a primary recommendation; add one acceptable alternative if relevant.>

## Acceptance criteria
- [ ] <observable server behaviour 1 the UI can consume>
- [ ] <backward compatibility / permissions / error handling as needed>

## Affected UI work
Blocks **<INPUT>**. Web UI change is ready to consume this once available.
```

## Guardrails
- Always target project **`NXP`**, set a **component** (required), and add the **`nxplatform`** tag to
  the **Tags** custom field `customfield_13956` (not just the built-in `labels`).
- Link direction matters: the **input** must end up *blocked by* the **new NXP** ticket. With the
  `createIssueLink` MCP tool that means `inwardIssue` = new NXP (blocker), `outwardIssue` = input
  (blocked), type `Blocks`. (Raw REST is the opposite convention.) Verify after creating; don't invert it.
  
- Don't fabricate a link/comment as done — issue links need REST (no MCP tool); state the real status.
- File backend work only when the client genuinely can't do it; confirm no existing endpoint/operation
  already covers the need before creating the ticket.
