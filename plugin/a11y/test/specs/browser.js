import '../imports';
import documentService from '@nuxeo/nuxeo-web-ui-ftest/features/step_definitions/support/services/documentService';
import UI from '@nuxeo/nuxeo-web-ui-ftest/pages/ui';
import login from '../helpers/login';
import { reportA11y } from '../a11y-reporter.js';

const EXPECTED_VIOLATIONS = {
  'html-has-lang': 1,
  'meta-viewport': 1,
  region: 1,
};

const EXPECTED_INCOMPLETE_VIOLATIONS = {};

describe('Nuxeo Browser', () => {
  let doc;

  before(async () => {
    let parent = documentService.init('Workspace', 'My Workspace');
    parent = await documentService.create('/default-domain/workspaces', parent);
    let child = documentService.init();
    child = await documentService.create(parent.path, child);
    doc = child;
  });

  after(async () => documentService.reset());

  reportA11y(EXPECTED_VIOLATIONS, EXPECTED_INCOMPLETE_VIOLATIONS, async () => {
    login();
    const ui = UI.get();
    ui.browser.browseTo(doc.path);
    ui.browser.currentPage.waitForDisplayed();
  });
});
