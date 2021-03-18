import { After } from '@cucumber/cucumber';
import nuxeo from '../services/client';

global.groups = {
  administrators: 'Administrators group',
  members: 'Members group',
  powerusers: 'Power users group',
};

fixtures.groups = {
  create: (group) => {
    const { groupname } = group;
    if (groupname in groups) {
      return groups[groupname];
    }
    return nuxeo
      .groups()
      .fetch(groupname)
      .catch((response) => {
        if (response.response && response.response.status && response.response.status === 404) {
          return nuxeo
            .groups()
            .create(group)
            .catch((err) => {
              // XXX try to handle NPE on UserRootObject
              if (err.response.status === 500) {
                return nuxeo.groups().create(group);
              }
              throw err;
            })
            .then((_group) => {
              groups[_group.groupname] = group.grouplabel;
              return _group;
            });
        }
      });
  },
  delete: (groupname) =>
    nuxeo
      .groups()
      .delete(groupname)
      .then(() => delete groups[groupname]),
};

After(() =>
  Promise.all(
    Object.keys(groups).map((group) => {
      if (group !== 'administrators' && group !== 'members' && group !== 'powerusers') {
        return fixtures.groups.delete(group).catch(() => {}); // eslint-disable-line arrow-body-style
      }
      return Promise.resolve();
    }),
  ),
);
