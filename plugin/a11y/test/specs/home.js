import LoginPage from '../pageobjects/login.page.js';
import HomePage from '../pageobjects/home.page.js';
/* import Login from '@nuxeo/nuxeo-web-ui-ftest/pages/login';
import UI from '@nuxeo/nuxeo-web-ui-ftest/pages/ui'; */
import { reportA11y } from '../a11y-reporter.js';

const EXPECTED_VIOLATIONS = {
  'aria-command-name': 15,
  'aria-input-field-name': 1,
  'aria-required-children': 1,
  'aria-tooltip-name': 1,
  'duplicate-id-active': 28,
  'landmark-one-main': 1,
  'meta-viewport': 1,
  'page-has-heading-one': 1,
  region: 19,
  'scrollable-region-focusable': 1,
};

const EXPECTED_INCOMPLETE_VIOLATIONS = {
  'aria-allowed-role': 5,
  'color-contrast': 0,
};

describe('Home Page', () => {
  reportA11y(EXPECTED_VIOLATIONS, EXPECTED_INCOMPLETE_VIOLATIONS, () => {
    LoginPage.open();
    LoginPage.login('Administrator', 'Administrator');
    HomePage.open();
    HomePage.recentlyEdited().waitForDisplayed();
    // we should be able to leverage these once WEBUI-278 lands
    /* const login = Login.get();
    login.username = 'Administrator';
    login.password = 'Administrator';
    login.submit();
    const ui = UI.get();
    ui.home.el.$('nuxeo-card[icon="nuxeo:edit"]').waitForDisplayed(); */
  });
});
