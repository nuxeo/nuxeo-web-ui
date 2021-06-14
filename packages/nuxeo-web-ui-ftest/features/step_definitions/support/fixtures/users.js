import { After } from '@cucumber/cucumber';
import nuxeo from '../services/client';

global.users = {
  Administrator: 'Administrator',
};

fixtures.users = {
  DEFAULT_PASSWORD: 'password',
  create: (user) => {
    const { username } = user.properties;
    if (username in users) {
      return users[username];
    }
    return nuxeo
      .users()
      .fetch(username)
      .catch((response) => {
        if (response.response && response.response.status && response.response.status === 404) {
          return nuxeo
            .users()
            .create(user)
            .catch((err) => {
              // XXX try to handle NPE on UserRootObject
              if (err.response.status === 500) {
                return nuxeo.users().create(user);
              }
              throw err;
            });
        }
        throw new Error(`unable to fetch user "${username}"`);
      })
      .then((_user) => {
        users[_user.id] = 'password';
        return _user;
      });
  },
  delete: (username) =>
    nuxeo
      .users()
      .delete(username)
      .then(() => delete users[username]),
};

After(() =>
  Promise.all(
    Object.keys(users).map((user) => {
      if (user !== 'Administrator') {
        const userWorkspace = `/default-domain/UserWorkspaces/${user}`;
        const userFavorites = `${userWorkspace}/Favorites`;
        return nuxeo
          .repository()
          .delete(userFavorites)
          .catch(() => {}) // eslint-disable-line arrow-body-style
          .then(() => nuxeo.repository().delete(userWorkspace))
          .catch(() => {}) // eslint-disable-line arrow-body-style
          .then(() => fixtures.users.delete(user))
          .catch(() => {}); // eslint-disable-line arrow-body-style
      }
      return Promise.resolve();
    }),
  ),
);
