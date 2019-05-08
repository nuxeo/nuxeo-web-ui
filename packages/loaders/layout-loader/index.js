const path = require('path');
const loaderUtils = require('loader-utils');
const validateOptions = require('schema-utils');
const layoutEngine = require('layout-engine');
const yaml = require('js-yaml');

const schema = {
  type: 'object',
  properties: {
    template: {
      type: 'string',
    },
  },
};

module.exports = function(source) {
  const options = loaderUtils.getOptions(this);
  validateOptions(schema, options, 'Layout Loader');

  const callback = this.async();

  const ext = path.extname(this.resourcePath);
  // eslint-disable-next-line no-console

  let json;
  if (ext === '.yaml') {
    json = yaml.safeLoad(source);
  } else if (ext === '.json') {
    json = JSON.parse(source);
  }

  if (!json) return callback(null, '');

  const content = layoutEngine[options.template](json);
  callback(null, content);
};
