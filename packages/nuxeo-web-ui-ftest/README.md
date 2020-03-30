## Nuxeo Web UI Functional Testing Framework

A framework to develop functional tests for [Nuxeo Web UI](https://github.com/nuxeo/nuxeo-web-ui), using [WebDriverIO](https://webdriver.io/) and [Cucumber](https://cucumber.io/).

## Getting Started

### Installation

You can install the latest Nuxeo Web UI Functional Testing framework via:

```
npm install @nuxeo/nuxeo-web-ui-ftest
```

Please keep in mind that the framework version must match the version of Web UI that needs to be tested:
```
# for the latest hotfix of Web UI 2.4 (for 10.10)
npm install @nuxeo/nuxeo-web-ui-ftest@^2.4.0

# for the latest hotfix of Web UI 2.2 (for 9.10)
npm install @nuxeo/nuxeo-web-ui-ftest@^2.2.0
```

### Project Structure

Cucumber tests are written in [Gherkin](https://docs.cucumber.io/gherkin/reference/), which are then translated into JavaScript instructions that run commands using the WebDriver protocol. Tests are written in feature files (ending with the .feature extension), which are composed by a set of Scenarios with one or more Steps. Step definitions are instructions defined in JavaScript files that match the steps used in the feature files, which can run WebdriverIO commands and make assertions.

The framework reads feature files, step definitions and resources by convention, so your project needs to follow a particular structure. Features files are read from the `features` folder, step definitions from `features/step_definitions`, and test resources (e.g. test images) are loaded from `test/resources`.

```
.
├── package.json
└── ftest
    ├── features
    │   ├── myfeature1.feature
    │   ├── myfeature2.feature
    │   ├── ...
    │   └── step_definitions
    │       ├── myfeature1.js
    │       ├── myfeature2.js
    │       └── ...
    └── resources
        ├── image.png
        └── ...
```

### Running Tests

We recommend adding the following script to your `package.json` file to run the functional tests on your project:

```
"scripts": {
  "ftest": "nuxeo-web-ui-ftest --report --screenshots --headless"
},
```

With this in place, `npm run ftest` will run the functional tests against Web UI, which is expected to be hosted on a nuxeo server running on the 8080 port.

### Examples

Please check the [Nuxeo DAM's marketplace project](https://github.com/nuxeo/marketplace-dam) for an example on how to use the functional testing framework to test contributions to Web UI.

## Documentation

Please check out the [Web UI functional testing documentation](https://doc.nuxeo.com/nxdoc/web-ui-functional-testing/).

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt) Copyright (c) Nuxeo SA


## About Nuxeo

Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris. More information is available at [www.nuxeo.com](http://www.nuxeo.com/).
