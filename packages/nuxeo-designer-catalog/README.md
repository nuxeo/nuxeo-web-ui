# Nuxeo View Designer - Catalog Generator

Tool that generates the element catalog for a specific [nuxeo-web-ui](https://github.com/nuxeo/nuxeo-web-ui) target platform and Web UI branch.

The catalog contains data about elements properties, methods and behaviors:
- Individual JSON files that describe a specific element
- CodeMirror compatible hints JSON file for autocomplete features

## Local build and development

### Install dependencies

```sh
npm install
```

Note: This version of the catalog generator requires node version >=22.13.0.

#### Catalog generation

```sh
gulp catalog --tp <target-platform-version> --webui-branch <branch-name>
```

#### Hints generation

```sh
gulp hints --tp <target-platform-version>
```

#### Upload catalog version

```sh
./scripts/maven-deploy.sh data/applications/nuxeo/<target-platform-version> <catalog-version>
```

#### Check that the analyzer can read every source

```sh
node src/check-sources.js [web-ui-root]
```

Run from the Web UI root as `npm run check:catalog` (needs `npm ci` in both the root and this package).
It analyzes the catalog entry points of `data/applications/nuxeo/2023.0/catalog-packages.json` with this
package's `polymer-analyzer` and fails when a Web UI or `@nuxeo` file cannot be parsed or loaded, or when an
element or behavior that went missing in WEBUI-1922 / WEBUI-2418 is not found. The Lint CI workflow runs it.

#### Clean up generated catalog data

```sh
npm run clean-data
```

## License

[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html) 

©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

All images, icons, fonts, and videos contained in this folder are copyrighted by Hyland Software, all rights reserved.

## About Nuxeo

Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris. More information is available at www.nuxeo.com.
