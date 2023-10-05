import UI from '@nuxeo/nuxeo-web-ui-ftest/pages/ui';
import Login from '@nuxeo/nuxeo-web-ui-ftest/pages/login';

const login = async (username = 'Administrator', password = 'Administrator') => {
  const logIn = Login.get();
  await logIn.username(username);
  await logIn.password(password);
  await logIn.submit();
  const ui = UI.get();
  await ui.waitForVisible('nuxeo-page');
};

export const authRedirect = async (browser, path) => {
  await login();
  await browser.url(path);
  await browser.execute(() => {
    document.dispatchEvent(new CustomEvent('automation-ready'));
  });
};

export default login;
