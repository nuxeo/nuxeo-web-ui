[![Build Status](https://qa.nuxeo.org/jenkins/buildStatus/icon?job=plugins_nuxeo-web-ui-master-master)](https://qa.nuxeo.org/jenkins/job/plugins_nuxeo-web-ui-master-master/)

## Nuxeo Web UI

> Ongoing work to build a new Nuxeo Web UI

### Building

To build and run the tests, simply start the Maven build:

    mvn clean install

To run functional tests:

    mvn clean install -Pftest

## Deploying

### Nuxeo Package

Install [nuxeo-web-ui Package](https://connect.nuxeo.com/nuxeo/site/marketplace/package/nuxeo-web-ui).

Otherwise use the Nuxeo package provided by the nuxeo-web-ui-marketplace sub module.
Install the nuxeo-web-ui package:
      - From the AdminCenter (Upload + install)
      - From the command line using `nuxeoctl mp-install nuxeo-web-ui-marketplace-$VERSION.zip`

### Manually

To deploy on Nuxeo Platform manually: copy the builded JAR bundles into `$NUXEO_HOME/nxserver/bundles`.

# Resources

## Reporting issues

- [https://jira.nuxeo.com/browse/NXP/component/12500/](https://jira.nuxeo.com/browse/NXP/component/15311/)
- [https://jira.nuxeo.com/secure/CreateIssue!default.jspa?project=NXP](https://jira.nuxeo.com/secure/CreateIssue!default.jspa?project=NXP)

# Licensing

[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html)

# About Nuxeo

Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with
SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Netflix, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris.
More information is available at [www.nuxeo.com](http://www.nuxeo.com).
