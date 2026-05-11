import { After, Before } from '@cucumber/cucumber';
import documentService from '../services/documentService.js';

fixtures.documents = documentService;

Before(function () {
  const maxRetries = 3;
  const retryDelay = 2000;
  const attempt = (n) =>
    documentService.getDocument('/default-domain').then(
      (doc) => {
        this.doc = doc;
      },
      (err) => {
        if (n < maxRetries) {
          return new Promise((resolve) => setTimeout(resolve, retryDelay)).then(() => attempt(n + 1));
        }
        throw err;
      },
    );
  return attempt(0);
});

After(() => documentService.reset());
