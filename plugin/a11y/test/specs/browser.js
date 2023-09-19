import '../imports';
import documentService from '@nuxeo/nuxeo-web-ui-ftest/features/step_definitions/support/services/documentService';
import { authRedirect } from '../helpers/login';
import { reportA11y } from '../a11y-reporter.js';

const EXPECTED_VIOLATIONS = {
  'aria-command-name': 1,
  'aria-roles': 3,
  'aria-tooltip-name': 1,
  'duplicate-id': 28,
  'landmark-one-main': 1,
  'meta-viewport': 1,
  'page-has-heading-one': 1,
  region: 24,
  'nested-interactive': 15,
};

const EXPECTED_INCOMPLETE_VIOLATIONS = {
  'aria-allowed-attr': 1,
  'aria-allowed-role': 7,
  'aria-valid-attr-value': 1,
  'color-contrast-enhanced': 2,
};

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
    await authRedirect(browser, `#!/browse${doc.path}`);
    await browser.$('#documentViewsItems nuxeo-page-item.iron-selected').waitForExist({ timeout: 15000 });
    const elementName = await browser.getAttribute('#documentViewsItems nuxeo-page-item.iron-selected', 'name');
    const context = await browser.$(`#nxContent [name='${elementName}']`);
    return context;
  });
});
