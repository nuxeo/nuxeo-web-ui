# Environment preparation & multi-branch runtime (Phases 4–5)

Reference for the `bug-fix-validation` skill. Read this when preparing environments or standing up the
buggy/fixed branches side by side.

## Runtime detection matrix

Detect from the repo, not from habit. Run the checks, then set up only what the change needs.

| Signal in the repo | Runtime | Setup command |
|---|---|---|
| `package.json` + `package-lock.json` | **npm** (this repo — Node ≥ 18) | `nvm use 22 && npm ci` |
| `yarn.lock` / `pnpm-lock.yaml` | yarn / pnpm | `yarn install --frozen-lockfile` / `pnpm i --frozen-lockfile` |
| `pom.xml`, `plugin/*/pom.xml` | **Maven + Java 21** (`lts-2025`; Java 17 on `maintenance-3.1.x`) | `mvn -B -ntp install` |
| `build.gradle` | Gradle | `./gradlew build` |
| `Dockerfile` | Docker image build | `docker build -t <tag> .` |
| `docker-compose.yml` | Docker Compose | ⚠️ the repo compose file is **stale** — prefer a single container (below) |
| `*.yaml` with `kind: Deployment` | Kubernetes | out of scope for local validation; use a single container |

For nuxeo-web-ui the default combination is: **npm** to build the UI bundle and **Docker** to serve it.
Maven is only relevant when `plugin/` is in the blast radius. This skill builds — it does not run the
repo test suites.

## Dependency hygiene

```bash
npm ci                                   # deterministic, matches CI
git checkout -- package-lock.json        # revert incidental churn ("peer": true lines)
```

If the build cannot resolve `@nuxeo/...`, a prior `npm install` replaced the sibling `nuxeo-elements`
symlinks. Re-link them (paths are relative on purpose):

```bash
rm -rf node_modules/@nuxeo/nuxeo-ui-elements      && ln -s ../../../nuxeo-elements/ui      node_modules/@nuxeo/nuxeo-ui-elements
rm -rf node_modules/@nuxeo/nuxeo-elements         && ln -s ../../../nuxeo-elements/core    node_modules/@nuxeo/nuxeo-elements
rm -rf node_modules/@nuxeo/nuxeo-dataviz-elements && ln -s ../../../nuxeo-elements/dataviz node_modules/@nuxeo/nuxeo-dataviz-elements
```

`@nuxeo` packages resolve from `https://packages.nuxeo.com/repository/npm-public/`, not npmjs.org.

## Retry policy

Recoverable: registry timeouts, image pull failures, container not yet ready, port races, a browser
binary download that dropped mid-way. Retry **5s → 15s → 45s**, then record a blocker and continue with the
next phase. Not recoverable (escalate immediately): missing Nuxeo CLID, missing Jira/GitHub credentials,
no Docker daemon and no alternative runtime.

## Throwaway Nuxeo instance (single container — preferred)

`docker-compose.yml` in the repo is stale (proxy upstreams `nuxeo_1`/`webui` do not match modern compose
service DNS). Use one container that serves Web UI directly at `/nuxeo/ui/`.

```bash
# Docker Desktop off? `open -a Docker`, wait until `docker info` succeeds.
# Package download needs Nuxeo Connect registration — reuse a CLID from an existing container:
CLID=$(docker inspect <existing-nuxeo> --format '{{range .Config.Env}}{{println .}}{{end}}' \
       | sed -n 's/^NUXEO_CLID=//p')

docker run -d --name nx-val-<ticket>-<role> -p <free-port>:8080 \
  -e NUXEO_DEV_MODE=true -e NUXEO_PACKAGES="nuxeo-web-ui" -e NUXEO_CLID="$CLID" \
  docker-private.packages.nuxeo.com/nuxeo/nuxeo:2025

curl -s -o /dev/null -w '%{http_code}\n' http://localhost:<free-port>/nuxeo/runningstatus   # 200 when ready
```

Match the image to the branch line: `nuxeo/nuxeo:2025` for `lts-2025`; for a `3.1.x` validation prefer
the image built from that maintenance line when the bug is version-sensitive.

**Always pick a free port.** `list_containers` (or `docker ps --format '{{.Names}} {{.Ports}}'`) first —
port `8080` is usually a live container and must not be disturbed. `dual-branch-up.sh` does this for you.

### Seeding test data

Admin is `Administrator:Administrator`. Use explicit `curl` flags — quoting `-u`/`-H` into a shell
variable breaks auth and yields 401.

```bash
curl -s -u Administrator:Administrator -H "Content-Type: application/json" -X POST \
  http://localhost:<port>/nuxeo/api/v1/path/default-domain/workspaces \
  -d '{"entity-type":"document","name":"val-ws","type":"Workspace","properties":{"dc:title":"Validation WS"}}'
```

Automation operations go to `/nuxeo/site/automation/<Operation.Id>` with
`{"params":{…},"input":"doc:/path"}`.

### Custom doctypes, schemas and layouts (Studio-configured bugs)

Web UI loads each layout from `${document.type}/nuxeo-${document.type}-${layout}-layout.html`. Studio
normally generates those. Without the customer's Studio project:

1. Reuse the original Studio project if the ticket links one and it still resolves — register its
   CLID/package on the throwaway instance.
2. **Fastest reliable path — override an existing type's layout, no server change.** Layouts are plain
   files under `nxserver/nuxeo.war/ui/document/<type>/`:
   ```bash
   UI=/opt/nuxeo/server/nxserver/nuxeo.war/ui
   docker exec nx-val-<ticket>-target cat $UI/document/file/nuxeo-file-create-layout.html > layout.html
   # …add the widget(s) that trigger the bug, bound to an existing field (dc:subjects is string[])…
   docker cp layout.html nx-val-<ticket>-target:$UI/document/file/nuxeo-file-create-layout.html
   ```
   Apply the **same** override to both containers so the comparison stays fair.
3. If a faithful setup is impossible, document the blocker honestly — do not fabricate evidence.

## Dual-branch, dual-port setup

`scripts/dual-branch-up.sh` automates the whole thing:

```bash
bash .cursor/skills/bug-fix-validation/scripts/dual-branch-up.sh WEBUI-1234 \
  --target lts-2025 --fixed fix-WEBUI-1234-foo-lts-2025 \
  [--packages "nuxeo-web-ui nuxeo-drive"] [--image <image>] [--fixed-pr 3259] \
  [--only target|fixed] [--no-build] [--prepare-only] [--print] [--remove] [--force]
```

Any git revision works for `--target`/`--fixed`: a branch, `origin/<branch>`, a tag or a sha — so
`--target lts-2025~1 --fixed lts-2025` validates a fix that is already merged. `--fixed-pr <n>`
resolves the head branch from a PR. `--prepare-only` builds the worktrees without starting containers
(useful when Docker is unavailable or you only need the built bundles).

What it does, per side:

1. Allocates a **free host port** (scanning from 8100, skipping ports already claimed by another run).
2. Creates a git worktree at `~/Desktop/Projects/WebUI/worktrees/<TICKET>/<role>` checked out at the ref, with its
   own `node_modules` (APFS copy-on-write clone of the main one — seconds, ~0 bytes).
3. `npm run build` with the chosen `NUXEO_PACKAGES`.
4. Starts `nx-val-<ticket>-<role>`, waits for `/nuxeo/runningstatus` = 200.
5. `docker cp dist/. <container>:<ui-dir>/` and rewrites the deployed `index.html` `base-url`.
6. Appends `NX_VAL_TARGET_URL` / `NX_VAL_FIXED_URL` (and container/port/worktree vars) to `env.sh`.

Both sides use the **same build pipeline**, so the only difference between them is the fix. That is what
makes the before/after comparison trustworthy — a marketplace bundle vs a dev build is not comparable.

## Deploy gotchas that silently break the app

- **`base-url` / broken links.** The dev build's `dist/index.html` hardcodes `<nuxeo-app base-url="/">`,
  and `docker cp` drops it next to the server's `index.jsp` (which computes `base-url="<context>/ui/"`).
  Tomcat then serves *your* `index.html`, `Nuxeo.UI.app.baseUrl` becomes `/`, and every `urlFor` link
  becomes root-relative `/#!/browse/…` → clicking navigates outside `/nuxeo/ui/` and 404s. The script
  rewrites it; if you deploy by hand, set `base-url="/nuxeo/ui/"` and verify in the console that
  `Nuxeo.UI.app.baseUrl` includes `/nuxeo/ui/`.
- **Addon provider errors (`Invalid provider: box`).** The default `NUXEO_PACKAGES` pulls
  `nuxeo-liveconnect`, whose cloud providers may not be configured on the server → 404. Build scoped to
  the addon under test: `NUXEO_PACKAGES="nuxeo-drive" npm run build`.
- **Browser cache.** After a redeploy, hard-refresh (Cmd+Shift+R). The capture harness sets
  `setCacheEnabled(false)`, so scripted runs are unaffected.
- **Bundle sanity check.** Addon elements land in a hashed `dist/<addon>.<hash>.bundle.js`. Confirm the
  deployed bundle really contains the change: `rg -c "<markup-from-the-diff>" <worktree>/dist/*.bundle.js`.

## Teardown

```bash
bash .cursor/skills/bug-fix-validation/scripts/dual-branch-up.sh <TICKET-ID> --remove
```

Removes both containers, both worktrees and the build dirs; keeps `Evidence/`. Verify with
`list_containers` that nothing pre-existing was touched.
