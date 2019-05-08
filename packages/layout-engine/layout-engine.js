const fs = require('fs');
const path = require('path');
const { _ } = require('lodash');
const { compile } = require('handlebars');
const SERVER_REGISTRY = require('./server-10.10.json');
const UI_REGISTRY = require('./ui-10.10.json');

const CORE_ATTRIBUTES = ['id', 'name', 'class', 'hidden', 'style', 'tabindex', 'title'];

// precompile all templates
const TEMPLATE = {};
fs.readdirSync(path.join(__dirname, 'templates'))
  .map((t) => path.join(__dirname, 'templates', t))
  .forEach((t) => {
    const { name } = path.parse(t);
    TEMPLATE[name] = compile(fs.readFileSync(t).toString());
  });

const replaceVars = (v, { field }) => {
  v = v.replace('$field', `document.properties.${field}`);
  v = v.replace('$xpath', field);
  if (v.indexOf('$label') !== -1) {
    const { schemas } = SERVER_REGISTRY;
    const [prefix, property] = field.split(':');
    const schema = Object.keys(schemas).find((s) => schemas[s]['@prefix'] === prefix);
    v = v.replace('$label', `label.${schema}.${property}`);
  }
  // fallback for other variables - look up for variable in global variables list and replace if it exists
  if (v.startsWith('$')) {
    v = ''; // v.replace(v, variables[val] || '');
  }

  return v;
};

const FIELD_MAPPER = (defaultMode = 'view') => (def) => {
  if (!def.field) return def;
  const { field } = def;
  const mode = def.mode || defaultMode;
  const [prefix, property] = field.split(':');
  const schema = Object.values(SERVER_REGISTRY.schemas).find((s) => s['@prefix'] === prefix);
  const type = schema[property];

  // prepare widget definition
  const wdef = _.clone(UI_REGISTRY.templates[type][mode]);

  // replace attribute variables and remove attributes with empty values
  wdef.attributes = wdef.attributes
    .map((a) => {
      return { name: a.name, value: replaceVars(a.value, { field }) };
    })
    .filter((attr) => attr.value.length > 0);

  // if necessary, replace variables in custom 'content' attribute, if it exists
  if (wdef.content) {
    wdef.content = replaceVars(wdef.content, { field });
  }
  // if necessary, replace variables in custom 'label' attribute, if it exists
  if (wdef.label) {
    wdef.label = replaceVars(wdef.label, { field });
  }

  // Build final widget definition
  const res = _.mergeWith({}, def, wdef, (dst, src) => {
    if (_.isArray(dst)) {
      return dst.concat(src);
    }
  });

  return res;
};

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
    const { element, mode } = model;
    const elements = model.elements.map(FIELD_MAPPER(mode));

    // move some top level attributes
    elements.forEach((el) => {
      const attrs = [];
      CORE_ATTRIBUTES.forEach((attr) => {
        if (el[attr]) {
          attrs.push({ name: attr, value: el[attr] });
        }
      });
      if (attrs.length) {
        el.attributes = el.attributes || [];
        el.attributes.unshift(...attrs);
      }
    });

    // add 'document' property if not exists
    const properties = model.properties || [];
    if (!properties.some((p) => p.name === 'document')) {
      properties.push({
        name: 'document',
        type: 'Object',
      });
    }

    const imports = [...new Set(elements.filter((el) => el.is.indexOf('-') > -1).map((el) => el.is))];

    return TEMPLATE[template]({ imports, element, elements, properties });
  };

const tmplFunctions = {};
Object.keys(TEMPLATE).forEach((t) => {
  tmplFunctions[t] = layoutTemplate(t);
});

module.exports = tmplFunctions;
