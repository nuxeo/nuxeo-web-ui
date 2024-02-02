import Login from '@nuxeo/nuxeo-web-ui-ftest/pages/login';
import UI from '@nuxeo/nuxeo-web-ui-ftest/pages/ui';

const login = async (username = 'Administrator', password = 'Administrator') => {
  const logIn = await Login.get();
  await logIn.username(username);
  await logIn.password(password);
  await logIn.submit();
  const ui = await UI.get();
  await ui.waitForVisible('nuxeo-page');
};
export default login;
