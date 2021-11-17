import Login from '@nuxeo/nuxeo-web-ui-ftest/pages/login';

const login = (username = 'Administrator', password = 'Administrator') => {
  const logIn = Login.get();
  logIn.username = username;
  logIn.password = password;
  logIn.submit();
};

export default login;
