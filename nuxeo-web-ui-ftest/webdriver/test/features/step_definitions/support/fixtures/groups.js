import nuxeo from '../services/client';

global.groups = {
  administrators: 'Administrators group',
  members: 'Members group',
  powerusers: 'Power users group',
};

fixtures.groups = {
  create: (group) => {
    const groupname = group.groupname;
    if (groupname in groups) {
      return groups[groupname];
    } else {
      return nuxeo.groups()
          .fetch(groupname)
          .catch((response) => {
            if (response.response && response.response.status && response.response.status === 404) {
              return nuxeo.groups().create(group).catch((err) => {
                // XXX try to handle NPE on UserRootObject
                if (err.response.status === 500) {
                  return nuxeo.groups().create(group);
                } else {
                  throw err;
                }
              }).then((_group) => {
                groups[_group.groupname] = group.grouplabel;
                return _group;
              });
            }
          });
    }
  },
  delete: (groupname) => nuxeo.groups().delete(groupname).then(() => delete groups[groupname]),
};

module.exports = function () {
  this.After(() => Promise.all(Object.keys(groups)
      .map((group) => {
        if (group !== 'administrators' &&
          group !== 'members' &&
          group !== 'powerusers') {
          return fixtures.groups.delete(group);
        } else {
          return Promise.resolve();
        }
      })));
};
