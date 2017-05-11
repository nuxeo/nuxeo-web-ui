import nuxeo from '../services/client';

global.groups = {
};

fixtures.groups = {
  create: (group) => {
    const name = group.properties.name;
    if (name in groups) {
      return groups[name];
    } else {
      return nuxeo.groups()
          .fetch(name)
          .catch((response) => {
            if (response.response && response.response.status && response.response.status === 404) {
              return nuxeo.groups().create(group);
            }
          });
    }
  },
  delete: (name) => nuxeo.groups().delete(name).then(() => delete groups[name]),
};

module.exports = function () {
  this.After(() => Promise.all(Object.keys(groups).map((group) => {
    if (group !== 'Administrator') {
      nuxeo.groups().delete(group);
      delete groups[group];
    }
  })));
};