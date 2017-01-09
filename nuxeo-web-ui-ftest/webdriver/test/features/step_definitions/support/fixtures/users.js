import nuxeo from '../services/client'

global.users = {
  Administrator: 'Administrator'
};

fixtures.users = {
  DEFAULT_PASSWORD: 'password',
  create: (user) => {
    let username = user.properties.username;
    if (username in users) {
      return users[username];
    } else {
      return nuxeo.users()
          .fetch(username)
          .catch((response) => {
            if (response.response && response.response.status && response.response.status === 404) {
              return nuxeo.users().create(user);
            }
          }).then((user) => {
            users[user.id] = 'password';
            return user;
          });
    }
  },
  delete: (username) => {
    return nuxeo.users().delete(username).then(() => {
      delete users[username];
    })
  }
};

module.exports = function () {
  this.After(() => Promise.all(Object.keys(users).map((user) => {
    if (user !== 'Administrator') {
      nuxeo.users().delete(user);
      delete users[user];
    }
  })));
};