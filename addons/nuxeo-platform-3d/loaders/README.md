# Vendored three.js loaders — do not edit

The files in this directory are **third-party code copied from [three.js](https://github.com/mrdoob/three.js) r81 (`v0.81.0`)** `examples/js/loaders/`. They are not Nuxeo-authored. They keep their original upstream authorship headers (`@author mrdoob`, and others).

| File                        | Upstream origin (three.js r81)                    |
| --------------------------- | ------------------------------------------------- |
| `GLTFLoader.js`             | `examples/js/loaders/GLTFLoader.js`               |
| `gltf/glTFLoader.js`        | `examples/js/loaders/gltf/glTFLoader.js`          |
| `gltf/glTF-parser.js`       | `examples/js/loaders/gltf/glTF-parser.js`         |
| `gltf/glTFLoaderUtils.js`   | `examples/js/loaders/gltf/glTFLoaderUtils.js`     |
| `gltf/glTFAnimation.js`     | `examples/js/loaders/gltf/glTFAnimation.js`       |
| `gltf/glTFShaders.js`       | `examples/js/loaders/gltf/glTFShaders.js`         |

## Why the copies are still here

[WEBUI-237](https://jira.nuxeo.com/browse/WEBUI-237) upgraded the `threejs` dependency from `v0.81.0` to `v0.125.0` (it is `^0.184.0` today). Current three.js no longer ships these ES5 example scripts, and its modern `GLTFLoader` reads glTF 2.0 only — it cannot load the glTF 1.0 models that existing 3D documents still hold. The r81 copies were therefore kept so that `nuxeo-3d-viewer` can continue to render them.

Both loader generations are live; neither is dead code. `nuxeo-3d-viewer._loaderChanged()` picks between them by transmission format:

- `loader === 'complete'` → `gltf/glTFLoader.js` (the older glTF 1.0 loader)
- otherwise → `GLTFLoader.js`

## Local modifications

Limited to what ES module imports require: named `export { ... }` statements at the end of each file, relative `import` statements between them, and a small number of strict-mode fixes noted inline. The loader logic itself is upstream. These files still expect a global `THREE`.

## SonarCloud

This directory is listed in `sonar.exclusions` in `sonar-project.properties` and is **deliberately not analysed** — see [WEBUI-2231](https://hyland.atlassian.net/browse/WEBUI-2231). Patching upstream files to satisfy a linter would fork them permanently and make any future refresh from three.js harder. The exclusion is scoped to `loaders/` and `controls/` only; the Nuxeo-authored parts of this addon (`elements/`, `document/`, `index.js`) are still analysed.

Do not "fix" findings in this directory. If these loaders need to change, the right move is to replace the vendored copies with a supported upstream path (for example, converting stored glTF 1.0 assets so the npm `three` loader can be used), not to edit them in place.
