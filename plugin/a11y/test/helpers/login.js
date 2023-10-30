import Login from '@nuxeo/nuxeo-web-ui-ftest/pages/login';

const login = async (username = 'Administrator', password = 'Administrator') => {
  const logIn = Login.get();
  await logIn.username(username);
  await logIn.password(password);
  await logIn.submit();
  $('nuxeo-page').waitForDisplayed();
};

export default login;
