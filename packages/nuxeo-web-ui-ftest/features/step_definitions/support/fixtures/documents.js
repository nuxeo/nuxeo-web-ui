import { After, Before } from '../../../../node_modules/@cucumber/cucumber';
import documentService from '../services/documentService';

fixtures.documents = documentService;

Before(function() {
  return documentService.getDocument('/default-domain').then((doc) => {
    this.doc = doc;
  });
});

After(() => documentService.reset());
