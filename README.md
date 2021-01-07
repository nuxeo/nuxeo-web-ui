[![Build Status](https://qa.nuxeo.org/jenkins/buildStatus/icon?job=master/addons_nuxeo-web-ui-master)](https://qa.nuxeo.org/jenkins/job/master/job/addons_nuxeo-web-ui-master/)
## Nuxeo Web UI

> Ongoing work to build a new Nuxeo Web UI. See [demo](https://webui-demo.nuxeo.com/nuxeo/ui/), use `demo`/`demo` for credentials.

## Getting Started

### Install dependencies

```sh
npm install -g gulp bower && npm install && bower install
```
Note: This version of Nuxeo Web UI requires node version >=6.0.0.

### Development workflow

#### Serve / watch

```sh
gulp serve
```

This outputs an IP address you can use to locally test and another that can be used on devices connected to your network.

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

(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

All images, icons, fonts, and videos contained in this folder are copyrighted by Nuxeo, all rights reserved.

## About Nuxeo

Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris. More information is available at www.nuxeo.com.
