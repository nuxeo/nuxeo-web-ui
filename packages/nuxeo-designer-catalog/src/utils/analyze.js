/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const { Analyzer, FsUrlLoader, PackageUrlResolver, generateAnalysis, Analysis } = require('polymer-analyzer');

module.exports = (pkg, sourcePaths, libraries, pkgManagement, callback) => {
  // workaround for handling analysis from bower_components libraries
  Analysis.isExternal = () => false;
  const componentDir = pkgManagement === 'npm' ? 'node_modules' : 'bower_components';
  Promise.all(
    sourcePaths
      .filter((p) => fs.existsSync(p))
      .map((sourcePath) => {
        let root = path.dirname(sourcePath);
        let name = path.basename(sourcePath);
        const base = root.substr(root.indexOf(pkg.base), root.length).replace(`${pkg.base}/`, '');
        root = root.replace(base, '');
        name = path.join(base, name);

        // create the polymer element analyzer
        const analyzer = new Analyzer({
          urlLoader: new FsUrlLoader(root),
          urlResolver: new PackageUrlResolver({
            componentDir,
            packageDir: root,
          }),
          moduleResolution: 'node',
        });

        return analyzer.analyze([name]).then((analysis) => {
          const data = generateAnalysis(analysis, analyzer.urlResolver);

          // workaround for adding missing elements
          data.elements = data.elements || [];
          data.behaviors = data.behaviors || [];
          if (data.namespaces) {
            data.namespaces.forEach((ns) => {
              data.elements = _.union(data.elements, ns.elements);
              if (ns.metadata && ns.metadata.polymer && ns.metadata.polymer.behaviors) {
                data.behaviors = _.union(data.behaviors, ns.metadata.polymer.behaviors);
              }
            });
          }

          // convert the elements/behaviors into the old hydrolysis structure to maintain legacy support
          data.elements = data.elements
            .filter((element) => {
              if (!element || !element.tagname) {
                return false;
              }
              if (pkg.isApplication) {
                // if we cannot find a parent, then we don't need to store this element
                return libraries.findIndex((library) => element.tagname.toLowerCase().startsWith(library.group)) >= 0;
              }
              return true;
            })
            .map((element) => {
              let elPath;
              if (element.path.indexOf(`/${componentDir}`) < 0 && element.path.startsWith('../')) {
                elPath = pkgManagement === 'npm' ? (elPath = element.path.replace('../', '')) : element.path;
              } else {
                elPath = element.path.replace(`/${componentDir}`, '');
              }

              return {
                type: 'element',
                desc: element.description,
                events: element.events.map((event) => {
                  return {
                    type: event.type,
                    name: event.name,
                    desc: event.description,
                  };
                }),
                observers: [], // no observers here
                properties: element.properties.map((property) => {
                  let { type } = property;
                  if (type && type.indexOf('|') >= 0) {
                    type = type.substring(0, type.indexOf('|')).trim();
                  }

                  const compatProperty = {
                    name: property.name,
                    desc: property.description,
                    type,
                    readOnly: property.readOnly,
                    published: true,
                    private: property.privacy !== 'public',
                  };

                  // we should just add this properties if necessary
                  if (property.defaultValue) {
                    compatProperty.default =
                      property.type === 'boolean' || property.type === 'number'
                        ? // eslint-disable-next-line no-eval
                          eval(property.defaultValue)
                        : property.defaultValue.replace(/['"]+/g, '');
                  }
                  if (property.reflectToAttribute) {
                    compatProperty.reflectToAttribute = property.reflectToAttribute;
                  }
                  if (property.inheritedFrom) {
                    compatProperty.__fromBehavior = property.inheritedFrom;
                  }
                  return compatProperty;
                }),
                behaviors: element.mixins,
                is: element.tagname,
                contentHref: path.join(root, element.path),
                path: elPath,
                jsdoc: {},
                demos: element.demos.map((demo) => {
                  return {
                    desc: demo.description,
                    path: demo.url,
                  };
                }),
              };
            });

          // convert the elements/behaviors into the old hydrolysis structure to maintain legacy support
          data.behaviors =
            data.metadata && data.metadata.polymer && data.metadata.polymer.behaviors
              ? data.metadata.polymer.behaviors.map((behavior) => {
                  const elPath =
                    behavior.path.indexOf(`/${componentDir}`) < 0
                      ? path.join(pkg.base, behavior.path)
                      : behavior.path.replace(`/${componentDir}`, '');
                  return {
                    type: 'behavior',
                    desc: behavior.description,
                    events: behavior.events.map((event) => {
                      return {
                        type: event.type,
                        name: event.name,
                        desc: event.description,
                      };
                    }),
                    observers: [],
                    jsdoc: {},
                    demos: behavior.demos.map((demo) => {
                      return {
                        desc: demo.description,
                        path: demo.url,
                      };
                    }),
                    symbol: behavior.name,
                    is: behavior.name,
                    contentHref: path.join(root, behavior.path),
                    path: elPath,
                    properties: behavior.properties.map((property) => {
                      const compatProperty = {
                        name: property.name,
                        desc: property.description,
                        type: property.type,
                        readOnly: property.readOnly,
                        published: true,
                        private: property.privacy !== 'public',
                      };

                      // we should just add this properties if necessary
                      if (property.defaultValue) {
                        compatProperty.default =
                          property.type === 'boolean' || property.type === 'number'
                            ? // eslint-disable-next-line no-eval
                              eval(property.defaultValue)
                            : property.defaultValue.replace(/['"]+/g, '');
                      }
                      if (property.reflectToAttribute) {
                        compatProperty.reflectToAttribute = property.reflectToAttribute;
                      }
                      if (property.inheritedFrom) {
                        compatProperty.__fromBehavior = property.inheritedFrom;
                      }
                      return compatProperty;
                    }),
                  };
                })
              : [];

          return {
            elements: data.elements,
            behaviors: data.behaviors,
            features: [],
          };
        });
      }),
  )
    .then((values) => {
      const out = { elements: [], behaviors: [], features: [], elementsByTagName: {} };
      values.forEach((data) => {
        const els = out.elements.map((el) => el.is);
        const bes = out.behaviors.map((be) => be.is);
        data.elements.forEach((element) => {
          element.scriptElement = undefined;
          if (element.behaviors) {
            element.behaviors.forEach((behavior) => {
              behavior.javascriptNode = undefined;
            });
          }
          if (element.properties) {
            element.properties.forEach((property) => {
              property.javascriptNode = undefined;
            });
          }
        });

        out.elements = out.elements.concat(
          (data.elements && data.elements.filter((el) => els.indexOf(el.is) < 0)) || [],
        );
        out.behaviors = out.behaviors.concat(
          (data.behaviors && data.behaviors.filter((be) => bes.indexOf(be.is) < 0)) || [],
        );
        out.features = out.features.concat(data.features || []);

        data.elements.forEach((element) => {
          if (!out.elementsByTagName[element.is]) {
            out.elementsByTagName[element.is] = element;
          }
        });
      });

      callback(null, out);
    })
    .catch((err) => {
      console.error(err.stack);
      callback(err);
    });
};
