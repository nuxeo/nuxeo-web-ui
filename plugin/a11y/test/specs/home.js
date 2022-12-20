import '../imports';
import documentService from '@nuxeo/nuxeo-web-ui-ftest/features/step_definitions/support/services/documentService';
import { authRedirect } from '../helpers/login';
import { reportA11y } from '../a11y-reporter.js';

const EXPECTED_VIOLATIONS = {
  'aria-command-name': 1,
  'aria-allowed-attr': 4,
  'aria-required-parent': 9,
  'aria-tooltip-name': 1,
  'duplicate-id': 28,
  'landmark-one-main': 1,
  'meta-viewport': 1,
  'page-has-heading-one': 1,
  region: 25,
  'nested-interactive': 15,
};

const EXPECTED_INCOMPLETE_VIOLATIONS = {
  'aria-allowed-role': 5,
  'color-contrast': 22,
};

describe('Nuxeo Home', () => {
  before(async () => {
    let parent = documentService.init('Workspace', 'My Workspace');
    parent = await documentService.create('/default-domain/workspaces', parent);
    const child = documentService.init();
    await documentService.create(parent.path, child);
  });

  reportA11y(EXPECTED_VIOLATIONS, EXPECTED_INCOMPLETE_VIOLATIONS, async () => {
    await authRedirect(browser, '#!/home');
    await browser.$('nuxeo-card[icon="nuxeo:edit"]').waitForExist({ timeout: 5000 });
    const context = await browser.$(`nuxeo-card[icon="nuxeo:edit"]`);
    return context;
  });
});
