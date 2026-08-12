# Evidence capture (Phases 6, 7, 9, 12)

Reference for the `bug-fix-validation` skill. Everything a reviewer or auditor needs must be on disk —
if it is not captured, it did not happen.

## Evidence tree

`scripts/validation-init.sh <TICKET-ID>` creates:

```
~/Desktop/validation/<TICKET-ID>/
  Evidence/
    Before/     # screenshots from the target (buggy) branch
    After/      # screenshots from the fixed branch, same labels
    Videos/     # <TICKET>-before.mp4, <TICKET>-after.mp4, scenario clips
    Logs/       # server logs, npm/build output, metrics json
    Console/    # browser console + page errors, one file per run
    Network/    # request/response logs (jsonl) + .har files
    Traces/     # profiles, performance traces
    Reports/    # test-cases.md, validation-report.md, diff images, proposed-tests/
  harness/      # puppeteer + puppeteer-screen-recorder + nuxeo-capture.js
  src/          # per-branch worktrees created by dual-branch-up.sh
  run.log       # execution log — every command, decision and environment detail
  env.sh        # NX_VAL_* variables; source it in every shell
```

Take the **same shots in the same order** on both sides. `s.shot('create-dialog')` writes
`Before/01-create-dialog.png` and `After/01-create-dialog.png`, so pairs line up by filename and
`compare-shots.sh` can diff them directly.

## Capture harness

`harness/nuxeo-capture.js` wraps Puppeteer with everything a Nuxeo Web UI run needs: the
`automationReady` bootstrap gate, cache disabled, video recording, console/page-error capture, a HAR
recorder, deep shadow-DOM helpers, Nuxeo login, and metrics. Write a small scenario file per run:

```js
// ~/Desktop/validation/WEBUI-1234/harness/after.js
const { session } = require('./nuxeo-capture');

(async () => {
  const s = await session({ label: 'after', phase: 'After', base: process.env.NX_VAL_FIXED_URL });
  await s.login();                                  // Administrator/Administrator by default
  await s.goto('/ui/#!/browse/default-domain/workspaces');
  await s.shot('browse');                           // -> Evidence/After/01-browse.png

  const probe = await s.deepEval((nodes) => {
    const el = nodes.find((n) => n.tagName.toLowerCase() === 'nuxeo-document-create-button');
    return el ? { found: true, hidden: el.hasAttribute('hidden') } : { found: false };
  });
  s.log(`probe: ${JSON.stringify(probe)}`);

  await s.shot('final');
  await s.finish();                                 // stops video, writes har/console/network/metrics
})();
```

```bash
. ~/Desktop/validation/WEBUI-1234/env.sh
node "$NX_VAL_HARNESS/after.js"
```

### API

| Call | Does |
|---|---|
| `session({ label, phase, base, locale, browser, video, viewport, headless })` | Launches the browser, starts the recorder, wires console/network capture. `phase` is `Before`/`After` (screenshot folder); `base` is like `http://localhost:8100/nuxeo`; `locale` forces `navigator.language`; `browser` is `chrome` (default) or `firefox`. |
| `s.login(user, password)` | Fills `#username`/`#password` on `login.jsp` and submits; waits for `/ui/`. |
| `s.goto(path)` | Navigates relative to `base` and waits for `nuxeo-app` to bootstrap. |
| `s.shot(name)` | Screenshot to `Evidence/<phase>/<nn>-<name>.png`. The `nn` prefix is added automatically — pass a bare name. |
| `s.deepEval(fn)` | Runs `fn(nodesAcrossAllShadowRoots)` in the page — the only reliable way to reach Web UI content. |
| `s.deepClick(predicateSource)` | Finds the first **visible** matching node across shadow roots and clicks it by coordinates. |
| `s.type(text)` / `s.press(key)` | Keyboard input with a human delay, so the video is followable. |
| `s.wait(ms)` | Pause (use ~2.5s on key states so the recording is readable). |
| `s.direction()` | `{ dir, lang, i18nLanguage }` as resolved at bootstrap — check this before judging an RTL screenshot. |
| `s.rawI18nKeys()` | Visible strings that still look like raw i18n keys (`label.foo.bar`), i.e. messages missing from the active bundle. Must be `[]`. |
| `s.a11yProbe()` | Mechanical accessibility checks across shadow roots: images without `alt`, controls with no accessible name, unlabelled inputs, positive `tabindex`, missing `lang`/`dir`. |
| `s.metrics()` | `page.metrics()` snapshot appended to `Logs/<label>-metrics.json` (Chrome only). |
| `s.log(msg)` | Appends to `run.log`. |
| `s.finish()` | Stops the recorder, writes HAR/console/network/metrics, closes the browser. |

## Locale, RTL and browser passes

The UI language and the text direction are both read from `navigator.language` **once at bootstrap**
(`i18n/i18n.js` and `setupRTLSupport` in `index.js`), so the harness stubs it before any page script
runs. Everything else follows from that.

```js
// Translations pass — long-word locale
const de = await session({ label: 'after-de', phase: 'After', base, locale: 'de' });
await de.login();
await de.goto('/ui/#!/browse/default-domain');
console.log(await de.rawI18nKeys());        // must be []
await de.shot('browse-de');
await de.finish();

// RTL pass — ar maps to dir="rtl" (also he, fa, ur)
const ar = await session({ label: 'after-ar', phase: 'After', base, locale: 'ar' });
await ar.login();
await ar.goto('/ui/#!/browse/default-domain');
console.log(await ar.direction());          // { dir: 'rtl', lang: 'ar', i18nLanguage: 'ar' }
await ar.shot('browse-ar-rtl');
await ar.finish();

// Second engine — Firefox has no CDP, so no video and no HAR
const ff = await session({ label: 'after-firefox', phase: 'After', base, browser: 'firefox', video: false });
```

Firefox needs a one-off install — `puppeteer-screen-recorder` pins its peer to puppeteer 19, which
predates the `browser: 'firefox'` option, so the second engine rides on an aliased modern puppeteer:

```bash
bash .cursor/skills/bug-fix-validation/scripts/validation-init.sh <TICKET-ID> --with-firefox
```

(~2 min, ~300 MB, cached in `~/.cache/puppeteer` for later runs). `session()` throws with this exact
command if the alias is missing. **Safari cannot be driven by Puppeteer** — run that pass by hand on
macOS and save the screenshots into `Evidence/After/` with a `-safari` suffix.

Name locale and browser shots so the report can reference them unambiguously:
`browse-de.png`, `browse-ar-rtl.png`, `browse-firefox.png`, `browse-safari.png`.

## Videos (required, both sides)

`session()` records to `Evidence/Videos/<TICKET>-<label>.mp4` via `puppeteer-screen-recorder`, which
bundles its own ffmpeg — no system ffmpeg needed. Keep clips 10–20s, pause ~2.5s on the states that
matter (bug visible, fixed behaviour, error message).

**Verify the recording before trusting it** — dump frames and eyeball the key states:

```bash
FFMPEG="$NX_VAL_HARNESS/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg"
"$FFMPEG" -i "$NX_VAL_EVIDENCE/Videos/<TICKET>-after.mp4" -vf fps=1 /tmp/frames/f_%02d.png
```

A step that silently no-op'd shows up in the frames.

## Before/after comparison

```bash
bash .cursor/skills/bug-fix-validation/scripts/compare-shots.sh \
  "$NX_VAL_EVIDENCE/Before/01-create-dialog.png" \
  "$NX_VAL_EVIDENCE/After/01-create-dialog.png" \
  "$NX_VAL_EVIDENCE/Reports/01-create-dialog-diff.png"
```

It writes a labelled side-by-side plus a pixel-difference image. Byte-identical PNGs are reported as
such — that is the signal to prove the change with a DOM probe instead of pixels.

Also diff the non-visual evidence:

```bash
diff "$NX_VAL_EVIDENCE/Console/before.log" "$NX_VAL_EVIDENCE/Console/after.log"
diff <(jq -r '.method+" "+(.status|tostring)+" "+.url' "$NX_VAL_EVIDENCE/Network/before.jsonl" | sort -u) \
     <(jq -r '.method+" "+(.status|tostring)+" "+.url' "$NX_VAL_EVIDENCE/Network/after.jsonl"  | sort -u)
```

## Server and build evidence

Server logs are context for explaining a UI symptom, not a backend test target.

```bash
docker logs nx-val-<ticket>-fixed > "$NX_VAL_EVIDENCE/Logs/server-fixed.log" 2>&1
```

## Known capture gotchas

- **Login form** — Nuxeo `login.jsp` uses `#username` / `#password` (names `user_name` /
  `user_password`) and `.login_button` / `input[type=submit]`. Not `input[name=username]`.
- **Bootstrap gate** — Web UI waits for `automation-ready` when `navigator.webdriver` is true. The
  harness sets `window.automationReady = true` before any script runs; without it, headless hangs.
- **Deep shadow DOM** — a flat `document.querySelector` finds almost nothing. Always walk shadow roots
  (`s.deepEval` / `s.deepClick` do).
- **Hidden duplicates** — Web UI keeps hidden copies of dialogs and their controls in the DOM. Filter to
  visible nodes (`getBoundingClientRect().width > 0 && height > 0`) or you will click a hidden one and
  silently do nothing.
- **The create FAB** is a `paper-fab` with `icon="nuxeo:add"` and no usable text or aria-label. Match by
  tag + icon, read its bounding box, click by coordinates.
- **`nuxeo-input` labels are bindings, not attributes** — `getAttribute('label')` returns the raw
  `[[i18n('title')]]` template. Match the inner native `input`/`textarea` by computed `aria-label`.
- **Prove it with a probe, not pixels** — a fix that only changes a role, `href`, attribute or a11y name
  can produce byte-identical screenshots. Log the probe and hover the element so the state is visible.
- **`user-playwright` screenshot path** — a relative `filename` is written under the MCP server's output
  dir, not your cwd. Pass an absolute path and verify where it landed before referencing it.
- **In-app links from a dev build** — `urlFor` yields root-relative `/#!/browse/…`. Navigate with
  `page.goto(`${BASE}/ui/#!${href.replace(/^\/#!/, '')}`)` rather than clicking. This is a dev-build
  artifact, not a regression — say so in the report.
- **Locale is read once, at bootstrap.** Pass `locale` to `session()`; changing it after the app has
  loaded (or navigating within the SPA) does nothing. One locale per session.
- **Always confirm the locale actually landed** — `await s.direction()` before judging an RTL or
  translation screenshot. `dir: 'ltr'` on an `ar` run means the override missed and the shot is
  worthless. Note that `en-GB`-style tags collapse to `en` in `nuxeo-i18n-behavior`.
- **A missing message renders as the raw key**, which is easy to miss visually in a dense screen —
  that is what `s.rawI18nKeys()` is for. Run it on every screen of a translation pass.
- **Firefox has no CDP** — no video, no HAR, no `page.metrics()`. The harness disables them and logs
  why; do not report their absence as a failure.
- **`a11yProbe()` is a smoke probe, not a WCAG audit.** A clean probe does not mean accessible: keyboard
  order, focus visibility, contrast and screen-reader wording still need a human pass.
