[![Build Status](https://qa.nuxeo.org/jenkins/buildStatus/icon?job=master/addons_nuxeo-web-ui-master)](https://qa.nuxeo.org/jenkins/job/master/job/addons_nuxeo-web-ui-master/)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/5d8cd2a3c56745ecaae7e7f92a683ea7)](https://www.codacy.com/app/Nuxeo/nuxeo-web-ui)

## Nuxeo Web UI

### About
Nuxeo Web UI is a standard base web application for Nuxeo Platform. It is highly customizable and scalable, developed with [Polymer](https://polymer-library.polymer-project.org/) and leveraging [nuxeo-elements](https://github.com/nuxeo/nuxeo-elements), our library of custom elements.

## Getting Started

### Install dependencies

```sh
npm install -g gulp bower && npm install && bower install
```
Note: This version of Nuxeo Web UI requires node version >=10.23.0.

### Development workflow

#### Serve / watch

```sh
gulp serve
```

This makes the Web UI available on `http://0.0.0.0:5000/` to locally test. A nuxeo platform is expected to run on `http://0.0.0.0:8080/`. To configure CORS, we need to add the following line to `nuxeo.conf` file in our Nuxeo Server:

```
    nuxeo.cors.urls=*
```

#### Run tests

```sh
gulp test:local
```

This runs the unit tests defined in the `app/test` directory through [web-component-tester](https://github.com/Polymer/web-component-tester).

#### Build & Vulcanize

```sh
gulp
```

Build and optimize the current project, ready for deployment. This includes linting as well as vulcanization, image, script, stylesheet and HTML optimization and minification.

## License

[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html) 

©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.

All images, icons, fonts, and videos contained in this folder are copyrighted by Hyland Software, all rights reserved.

## About Nuxeo

Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris. More information is available at www.nuxeo.com.
