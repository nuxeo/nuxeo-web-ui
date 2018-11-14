import {
  After,
} from 'cucumber';
import nuxeo from '../services/client';

global.addedComments = [];

fixtures.comments = {
  create: (parentId, author, text) => {
    const params = {
      body: {
        'entity-type': 'comment',
        parentId,
        author,
        text,
      },
    };
    return nuxeo.request(`/id/${parentId}/@comment`).post(params)
      .then((response) => {
        if (response.ancestorIds.length === 1) {
          addedComments.push(response);
        }
      });
  },

  get: (author, text) => addedComments.find(item => item.author === author && item.text === text),
};

After(() => addedComments = []);
