const path = require('path');
const loaderUtils = require('loader-utils');
const validateOptions = require('schema-utils');
const layoutEngine = require('layout-engine');

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
  console.log(this.resourceQuery);

  if (ext === '.json') {
    const layout = JSON.parse(source);
    const content = layoutEngine[options.template](layout);
    callback(null, content);
  } else {
    callback(null, '');
  }
};
