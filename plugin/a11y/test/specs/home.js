import '../imports';
import UI from '@nuxeo/nuxeo-web-ui-ftest/pages/ui';
import login from '../helpers/login';
import { reportA11y } from '../a11y-reporter.js';

const EXPECTED_VIOLATIONS = {
  'aria-command-name': 1,
  'aria-allowed-attr': 3,
  'aria-required-parent': 9,
  'aria-tooltip-name': 1,
  'duplicate-id': 28,
  'landmark-one-main': 1,
  'meta-viewport': 1,
  'page-has-heading-one': 1,
  region: 21,
  'nested-interactive': 13,
};

const EXPECTED_INCOMPLETE_VIOLATIONS = {
  'aria-allowed-role': 5,
  'color-contrast': 0,
};

describe('Home Page', () => {
describe('Nuxeo Home', () => {
  reportA11y(EXPECTED_VIOLATIONS, EXPECTED_INCOMPLETE_VIOLATIONS, () => {
    login();
    const ui = UI.get();
    ui.home.el.$('nuxeo-card[icon="nuxeo:edit"]').waitForDisplayed();
  });
});
