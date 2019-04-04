const fs = require('fs');
const path = require('path');
const { compile } = require('handlebars');

// precompile all templates
const TEMPLATE = {};
fs.readdirSync(path.join(__dirname, 'templates'))
  .map((t) => path.join(__dirname, 'templates', t))
  .forEach((t) => {
    const { name } = path.parse(t);
    TEMPLATE[name] = compile(fs.readFileSync(t).toString());
  });

/**
 * Creates a function that generates layouts given an input template.
 * @param template the template name to be used to generate the layouts.
 * @returns a function that generates layouts.
 */
const layoutTemplate = (template) =>
  /**
   * Creates a custom element, given a model as input.
   *
   * @param model - model of the element.
   * @returns HTML of the layout element.
   */
  (model) => {
    const { element, elements, properties } = model;
    const imports = [...new Set(model.elements.filter((el) => el.is.indexOf('-') > -1).map((el) => el.is))];
    return TEMPLATE[template]({ imports, element, elements, properties });
  };

const tmplFunctions = {};
Object.keys(TEMPLATE).forEach((t) => {
  tmplFunctions[t] = layoutTemplate(t);
});

module.exports = tmplFunctions;
