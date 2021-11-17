import Login from '@nuxeo/nuxeo-web-ui-ftest/pages/login';
import UI from '@nuxeo/nuxeo-web-ui-ftest/pages/ui';

const login = (username = 'Administrator', password = 'Administrator') => {
  const logIn = Login.get();
  logIn.username = username;
  logIn.password = password;
  logIn.submit();
  const ui = UI.get();
  ui.waitForVisible('nuxeo-page');
};

export default login;
