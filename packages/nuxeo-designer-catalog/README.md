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

Note: This version of the catalog generator requires node version >=14.0.0.

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

#### Clean up generated catalog data

```sh
npm run clean-data
```

## License

[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html) 

(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

All images, icons, fonts, and videos contained in this folder are copyrighted by Nuxeo, all rights reserved.

## About Nuxeo

Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris. More information is available at www.nuxeo.com.
