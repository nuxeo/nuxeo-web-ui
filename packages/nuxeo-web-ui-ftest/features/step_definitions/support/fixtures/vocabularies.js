import { After } from '@cucumber/cucumber';
import nuxeo from '../services/client';

global.addedVocabularyEntries = [];

fixtures.vocabularies = {
  createEntry: (directoryName, id, properties) =>
    nuxeo
      .request(`/directory/${directoryName}/${id}`)
      .get()
      .catch(() => {
        const params = {
          body: {
            'entity-type': 'directoryEntry',
            directoryName,
            properties,
          },
        };
        return nuxeo
          .request(`/directory/${directoryName}`)
          .post(params)
          .then((response) => {
            addedVocabularyEntries.push(response);
          })
          .catch(() => {});
      }),
};
After(() =>
  Promise.all(
    addedVocabularyEntries.map((entry) =>
      nuxeo
        .request(`/directory/${entry.directoryName}`)
        .delete(entry)
        .catch(() => {}),
    ),
  ) // eslint-disable-line arrow-body-style
    .then(() => {
      addedVocabularyEntries = [];
    }),
);
