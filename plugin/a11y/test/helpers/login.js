import Login from '@nuxeo/nuxeo-web-ui-ftest/pages/login';

const login = async (username = 'Administrator', password = 'Administrator') => {
  const logIn = Login.get();
  await logIn.setusername(username);
  await logIn.setpassword(password);
  await logIn.submit();
};

export const authRedirect = async (browser, path) => {
  await login();
  await browser.url(path);
  await browser.execute(() => {
    document.dispatchEvent(new CustomEvent('automation-ready'));
  });
};

export default login;
