# Writing and accuracy

The published notes have a consistent voice. Match it, and hold every sentence to the accuracy
gates at the bottom.

## Voice

Write for a customer administrator or end user who does not know the codebase and does not
care how the fix was made.

- **Outcome first, mechanism second (or not at all).** What can they now do, or stop
  suffering?
- **Third person, mostly.** "Users can now…", "Administrators can now…", "Comments now
  display…". Second person appears occasionally for a personal preference ("Your preferred view
  configuration is preserved across sessions") — use it sparingly.
- **Present tense for the new behaviour, past tense for the defect.**
  "Fixed an issue where …. The application now automatically recovers from invalid stored
  values."
- **Hedge conditional bugs honestly.** If it only happened sometimes, say "could":
  "Fixed an issue where corrupted local storage data **could** prevent navigation…". Do not
  imply it always happened, and do not imply it was rare if it was not.
- **No apology, no blame, no history.** Never name the release that introduced a regression.
  Describe a regression fix as a restoration: "Restored the expected width of the Document
  Title column in List View…".

## Verbs that carry the meaning

`Improved` · `Enhanced` · `Fixed` · `Resolved` · `Restored` · `Added` · `Introduced` ·
`Migrated` · `Removed` · `Eliminated` · `Preserved`

Item titles (Layout A) take one of two shapes, both published:

- **Verb-led:** `***Improved comment author display:***`, `***Enhanced Grid View
  accessibility:***`, `***Migrated unit testing framework:***`
- **Noun phrase:** `***Resizable Navigation Panels:***`, `***Saved View Preferences:***`,
  `***Read-Only Vocabulary Protection:***`

Prefer verb-led for fixes, noun phrases for new capabilities a customer will look for by name.

## Terminology

- **Use the label the user sees, capitalised as the product capitalises it:** Grid View,
  List View, Recent Documents, Favorites, Permissions screen, Group view, Document Viewer,
  Nuxeo Drive Synchronisation Roots, Create button, NXQL Search page.
- **Never use internal names:** no element names (`nuxeo-data-table`), no file paths, no CSS
  variables, no field or schema ids, no scanner or tool names (Sonar, Veracode, Dependabot), no
  CVE ids, and no framework internals beyond the one legitimate case of naming a test framework
  in a quality claim.
- **Spelling:** published pages lean British — *behaviour*, *colour*, *synchronisation*,
  *visualisation*, *cancelling*. They are not perfectly consistent (both *synchronization* and
  *colours* appear), so: prefer the British form, keep one convention within a page, and leave
  a **UI label spelled exactly as the product spells it** even when that clashes. The published
  2025.17.0 note does precisely this — "the **Favorites** list did not display an empty-state
  message when no **favourites** were available".
- **`nuxeo.conf` properties are quoted verbatim** in a code block. They are the one internal
  identifier customers need.

## Length

- **Release Notes Summary field:** one sentence, two at the absolute most, single line.
- **A page bullet:** one or two sentences. If it needs three, it is probably two changes.
- **Plain bullets** (accessibility, quality) can be a single clause: "Date picker dropdowns can
  now be dismissed using the Esc key."
- **Layout B intro sentence:** one sentence naming the themes of the release.

## Worked rewrites

| Don't | Do |
|---|---|
| "Fixed TypeError 'Cannot read properties of null (reading unshift)' in `nuxeo-recent-documents` when localStorage holds null." | "Fixed an issue where corrupted local storage data could prevent navigation from the Recent Documents list. The application now automatically recovers from invalid stored values." |
| "Fixed `nuxeo-user-avatar` text overflow using 3+ part name." | "User avatars now display only the first and last name initials, preventing initials from overflowing the avatar circle for users with multi-part names." |
| "WEBUI-1978: WOPI button not displayed after page refresh due to late enricher initialization." | "Fixed an issue that could cause the WOPI action button to disappear after a page refresh. The required metadata is now loaded correctly during the initial request, ensuring the action remains available when applicable." |
| "Bumped 14 npm packages and enabled `npm ci`." | "Locked JavaScript dependencies to verified versions and adopted deterministic dependency installation processes to improve supply-chain security and ensure consistent builds across environments." |
| "Accessibility : Screen Reader : Redundant and Adjacent Links" | "Improved Grid View accessibility by eliminating redundant adjacent links that could cause duplicate announcements by screen readers during keyboard navigation." |

The left column in each row is a real ticket title or a plausible engineering restatement. The
right column is what actually shipped. The pattern is always the same: drop the identifier,
drop the internal noun, name the user-visible surface, state the new behaviour.

## Accuracy gates

Run these before handing over a draft. Any failure is a blocker, not a nit.

1. **Traceability.** Every sentence maps to at least one ticket in the release scope. If you
   cannot name the ticket, delete the sentence. Record the mapping in the coverage ledger — not
   on the page.
2. **No unsupported generalisation.** A fix to one widget is not "improved forms throughout the
   application". Claim exactly the scope that shipped.
3. **Read past the title.** Ticket titles describe the symptom as first reported and are often
   wrong about the cause and sometimes about the fix. Use the description, the comments and the
   linked PR. Where the ticket is thin, read the diff.
4. **Both lines say the same thing — always.** The codebase is shared, so there is no such
   thing as a functional change that ships on one LTS line and not the other. The two pages
   describe an identical set of changes: each change is written once, and that same text appears
   on both pages. If the two buckets are uneven, the change is still written once and still
   appears on both — say so in the handover and keep going. Reconciling the buckets is not this
   skill's job (`SKILL.md`, *What this skill does not do*).
5. **Every sentence comes from a ticket in the bucket.** The buckets define what shipped, and
   this skill trusts them; verification happens upstream. What you must not do is write from
   memory, from a code diff, or from a ticket that is not in either bucket.
6. **Nothing dropped.** Every in-scope ticket is either a bullet or an explicit, reasoned
   exclusion.
7. **No forward promises.** Never say a change is "coming", "planned" or "will be improved".
   The notes describe what shipped.
   *One sanctioned exception:* an accessibility conformance page may carry **Known Accessibility
   Issues**, **Coming up next** and **Evaluation Methods Used** sections, because conformance
   reporting is expected to disclose known gaps and planned remediation. 2025.7.0 is the
   published precedent. Do not extend this to any other subject.
8. **A flag-gated feature states both states.** Rare — see `format-template.md`. When it does
   apply, describe flag-off and flag-on behaviour and give the property. Do not invent a
   flag-on/flag-off split for an ordinary change.
9. **No security detail.** No CVE ids, package names, versions, severities, vulnerability
   classes or scanner names (Sonar, SonarCloud, Veracode, Dependabot). One security sentence —
   see `classification-rules.md`.
