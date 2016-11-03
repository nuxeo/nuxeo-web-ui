# About nuxeo-document-distribution-chart

**Nuxeo Document Distribution Chart** is a Polymer element for displaying Document distribution of a Nuxeo repository within a sunurst chart built upon d3js.

## Requirements

This element requires Nuxeo 8.4 platform or greater.

This element needs the elasticsearch passthrough enabled. Add the following property in nuxeo.conf:

    elasticsearch.httpEnabled=true

See [Documentation](https://doc.nuxeo.com/x/5Y_RAQ).

## Limitations

The *size* mode does not properly take into account the size of the Versions of Documents.

##About Nuxeo
Nuxeo dramatically improves how content-based applications are built, managed and deployed, making customers more agile, innovative and successful. Nuxeo provides a next generation, enterprise ready platform for building traditional and cutting-edge content oriented applications. Combining a powerful application development environment with SaaS-based tools and a modular architecture, the Nuxeo Platform and Products provide clear business value to some of the most recognizable brands including Verizon, Electronic Arts, Sharp, FICO, the U.S. Navy, and Boeing. Nuxeo is headquartered in New York and Paris. More information is available at [www.nuxeo.com](http://www.nuxeo.com).
