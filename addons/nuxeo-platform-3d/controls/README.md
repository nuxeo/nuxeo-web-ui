# Vendored three.js controls — do not edit

`OrbitControls.js` is **third-party code copied from [three.js](https://github.com/mrdoob/three.js) r81 (`v0.81.0`)** `examples/js/controls/OrbitControls.js`. It is not Nuxeo-authored and keeps its original upstream authorship header (`@author qiao`, `@author mrdoob`, and others).

## Why the copy is still here

[WEBUI-237](https://jira.nuxeo.com/browse/WEBUI-237) upgraded the `three` dependency from `v0.81.0` to `v0.125.0` (it is `^0.184.0` today) and copied this file in so that the orbit/zoom/pan controls could be imported as an ES module. `nuxeo-3d-viewer._setupControls()` instantiates it for every 3D preview, so it is live code.

## Local modifications

Limited to what ES module imports require: a named `export { OrbitControls }` at the end of the file. The control logic is upstream, and the file still expects a global `THREE`.

## SonarCloud

This directory is listed in `sonar.exclusions` in `sonar-project.properties` and is **deliberately not analysed** — see [WEBUI-2231](https://hyland.atlassian.net/browse/WEBUI-2231). Patching an upstream file to satisfy a linter would fork it permanently and make any future refresh from three.js harder. The exclusion is scoped to `loaders/` and `controls/` only; the Nuxeo-authored parts of this addon (`elements/`, `document/`, `index.js`) are still analysed.

Do not "fix" findings in this directory. If the controls need to change, prefer moving to the maintained `OrbitControls` shipped with the npm `three` dependency over editing this copy.
