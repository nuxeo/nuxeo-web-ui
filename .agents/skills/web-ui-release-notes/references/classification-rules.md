# Classification — include, exclude, and which category

Two decisions per merged item: **does it belong on the page**, and **where**.

## The include test

Include an item if a customer can answer yes to any of these:

1. **Can I see it?** Behaviour, layout, wording, a new control, a fixed error.
2. **Must I act on it?** A new or changed `nuxeo.conf` property, an opt-in flag, a default that
   moved, anything that touches a customisation.
3. **Would I ask about it in a security or compliance review?** Vulnerability remediation,
   dependency hardening, accessibility conformance, test coverage of the shipped product.

Exclude it if the only honest answer is "it changed how the Web UI team works".

### The line is real, and it is not "is this a CI/CD ticket"

From 2025.18.0, all four of these were `[CI/CD]`-tagged tickets. Two shipped in the notes and
two did not:

| Ticket | Decision | Why |
|---|---|---|
| `ELEMENTS-1981` — lock JS dependencies to verified versions | **Included** as *Improved build reproducibility and security* | Supply-chain posture. Customers and auditors ask about it. |
| `ELEMENTS-1972` — migrate unit tests from Karma to Web Test Runner | **Included** as *Migrated unit testing framework* | A claim about how the shipped product is tested. |
| `WEBUI-2041` — fix broken preview environment on CI/CD | **Excluded** | Internal build infrastructure. Invisible in the product. |
| `ELEMENTS-1980` + `WEBUI-2126` — alpha build workflow for rebranding | **Excluded** | Internal release tooling for unmerged work. |

So the discriminator is *what the change lets us claim about the product*, not which label the
ticket carries.

### Always excluded

- Internal CI, preview environments, release tooling, branch or workflow plumbing.
- Refactors, renames and code-quality work with no behavioural or security consequence.
- Test-only changes that do not change the framework story (an added unit test is not news).
- Reverted or partially backed-out work — if it did not ship in the end, it is not in the notes.
  You will know this from the ticket (reopened, resolution withdrawn), which is the only place
  this skill looks.

### Handle with care

- **"Configuration" cuts both ways** — split it before deciding:
  - *Internal configuration* (build, CI, workflow, toolchain, repo plumbing) is **excluded**.
    It is also the usual explanation for a ticket that sits in one release bucket only — and not
    news either way, so it needs no investigation.
  - *Customer-facing configuration* — a `nuxeo.conf` property an administrator sets or must know
    changed — is **included**, because include-test question 2 applies: they have to act on it.
    2025.7.0 published exactly this, an item about defining the display order of document types
    through `nuxeo.conf`. Being customer-facing, it ships on both lines like anything else.
- **Regressions we shipped and then fixed inside the same release** — do not mention either
  half; the customer never saw it.
- **A regression fix for something customers did see** — include it, described as a
  restoration ("Restored the expected width of the Document Title column…"), not as an
  apology and not by naming the release that broke it.

## Security, Sonar and dependency work — one sentence, always

This is a firm rule, not a preference.

A ticket that appears in one bucket and not the other is classified on its own merits, exactly
like any other. The pages stay twins: one bullet, written once, on both. Chasing *why* the
buckets differ is release management and happens before this skill runs.

**Everything in this bucket collapses into a single security sentence:**

- CVE remediation and vulnerability fixes of any severity.
- Dependency upgrades taken for security reasons, including Dependabot batches.
- **Sonar / SonarCloud / SonarQube findings and maintainability tickets.** Treat these as
  security work and fold them into the same sentence. They are *not* excluded, and they are
  *never* announced as code-quality or Sonar remediation.
- Scanner-driven hardening work of any kind.

The sentence, as published in 2025.19.0:

> Security updates have been implemented to address identified vulnerabilities and strengthen
> platform protection.

**Never** name a CVE id, a package, a version number, a vulnerability class, a severity, a
scanner (Sonar, SonarCloud, Veracode, Dependabot) or a rule id in customer prose. Two reasons: an
itemised list tells anyone attacking an un-upgraded instance exactly where to aim, and it dates
badly the moment the next release ships.

Older pages did itemise — 2025.10.0 named `jsondiffpatch` and its exact before/after versions,
2025.7.0 named Veracode. **That is legacy style. Do not copy it.** See
`published-patterns.md`.

Two things are *not* in this bucket and keep their own bullets:

- **A security fix with a visible behaviour change** — if a customer must change a
  configuration, or something they relied on now behaves differently, that consequence is
  described plainly in its own bullet, without the vulnerability detail.
- **Supply-chain and build-integrity posture claims** — "Locked JavaScript dependencies to
  verified versions… to improve supply-chain security and ensure consistent builds" is a
  standing claim about how the product is built, not a patch. It sits under the platform
  category.

A single routine dependency bump with no security driver is not news at all — exclude it.

## Merge before you classify

One user-visible change is one bullet, regardless of how many tickets carry it. Merge when:

- The same change is filed once per repo (`ELEMENTS-1973` + `WEBUI-1736`, redundant adjacent
  links) or once per line.
- Two tickets are halves of one story (`ELEMENTS-1971` "Part 1" + `WEBUI-1741` "Part 2",
  repeated button names) — the customer sees one improvement.
- Several small fixes share one cause and one outcome. Prefer one clear sentence to four
  fragments.
- A Jira **issue link** makes two tickets worth *looking* at, never worth merging on its own.
  Merge on the outcome — see `SKILL.md` Step 4.

Paired tickets very often carry an *identical* Release Notes Summary — that duplication is the
signal to merge, not a reason to write two bullets.

## Categories

Current practice groups **by product area**. Use this taxonomy:

| Category | Takes |
|---|---|
| **User Experience Improvements** | Navigation, browsing, listings, dialogs, avatars, comments, session handling, anything in the everyday path |
| **Search and Export Improvements** | Search forms, NXQL page, saved searches, column preferences, CSV export |
| **Workflow Improvements** | Tasks, transitions, delegation, workflow diagrams, workflow translations |
| **Document Management Improvements** | Create/edit/copy/paste, metadata and complex properties, validation, publication, renditions |
| **Administration & Directory Management** | Users, groups, vocabularies, permissions, admin screens |
| **Accessibility Improvements** | Screen readers, keyboard navigation, focus, contrast, zoom, WCAG conformance |
| **Storage and Integration Improvements** | S3 direct download, preview, WOPI, Nuxeo Drive, third-party integrations |
| **Platform Reliability and Security** | Vulnerability remediation, dependency hardening, build reproducibility, stability, packaging |

Older pages (2025.17.0 and before) grouped **by change type** instead — *Enhancements*,
*Bug Fixes*, *Security & Quality Improvements*, *Performance, Reliability & Quality
Improvements*. That is still valid published style and fine to match if a release is small and
mostly bug fixes, but prefer product-area grouping: it tells a customer whether the release
touches the part of the product they care about.

Rules that hold either way:

- **Accessibility always gets its own category**, never folded into bug fixes. It is a
  conformance story with its own audience.
- **Security is never itemised**, and Sonar work counts as security. One sentence only — see the
  rule above.
- **Order most user-visible first**, platform/security last. Accessibility sits in the middle.
- **Drop empty categories.** Only include the ones this release actually populated.
- **Sub-group headings** (Layout B) follow `Improved <Area>` or `Enhanced <Area>`:
  *Improved Navigation Experience*, *Improved Session Management*, *Enhanced Search
  Experience*, *Enhanced CSV Exports*.
- **Place an item by the concern a reader would scan for, not by the mechanism of the fix.**
  This is the grouping form of "outcome first, mechanism second", and it is where placement
  goes wrong. Alt text on functional images *is* a labelling change, but a reader looks for it
  under screen reader support, because what changed is what a screen reader announces.
  **Where the ticket title names the concern — `Screen Reader: …`, `Drag and Drop: …`,
  `Search Filters: …` — that is the sub-group**, and it beats any reasoning of your own about
  which mechanism the fix belongs to. 2025.20.0 shipped the alt-text bullet under
  *Improved Labelling and Error Reporting* and a reviewer moved it to *Improved Screen Reader
  Support* on both pages.

## Recording the decision

Every excluded ticket needs a stated reason in the Step 6 coverage ledger. "Excluded" with no
reason is how delivered work quietly goes unannounced — which is exactly what happened to
`WEBUI-2180` in 2025.18.0.
