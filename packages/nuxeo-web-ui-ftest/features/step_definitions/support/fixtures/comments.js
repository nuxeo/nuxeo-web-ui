import Nuxeo from 'nuxeo';
// eslint-disable-next-line import/no-extraneous-dependencies
import { After } from '@cucumber/cucumber';

global.addedComments = [];

fixtures.comments = {
  create: (parentId, author, text) => {
    const params = {
      body: {
        'entity-type': 'comment',
        parentId,
        text,
      },
    };
    const nuxeo = new Nuxeo({
      auth: { method: 'basic', username: author, password: users[author] },
      baseURL: process.env.NUXEO_URL,
      headers: { 'nx-es-sync': 'true' },
    });
    return nuxeo
      .request(`/id/${parentId}/@comment`)
      .post(params)
      .then((response) => {
        if (response.ancestorIds.length === 1) {
          addedComments.push(response);
        }
      });
  },

  get: (author, text) => addedComments.find((item) => item.author === author && item.text === text),
};

After(() => {
  addedComments = [];
});
