var path = require('path');

var rootPath = (__dirname).split(path.sep).slice(-1)[0];

var mapping = {};
mapping['/components/' + rootPath  + '/app/bower_components'] = 'bower_components';

module.exports = {
  'suites': ['test'],
  'webserver': {
    'pathMappings': [mapping]
  }
};
