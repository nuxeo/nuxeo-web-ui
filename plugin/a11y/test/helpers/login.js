import Login from '@nuxeo/nuxeo-web-ui-ftest/pages/login';

const login = async (username = 'Administrator', password = 'Administrator') => {
  const logIn = Login.get();
  await logIn.setusername(username);
  await logIn.setpassword(password);
  await logIn.submit();
};

export default login;
