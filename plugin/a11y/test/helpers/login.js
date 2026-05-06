import Login from '@nuxeo/nuxeo-web-ui-ftest/pages/login';
import UI from '@nuxeo/nuxeo-web-ui-ftest/pages/ui';

const login = async (username = 'Administrator', password = 'Administrator') => {
  const logIn = await Login.get();
  await logIn.username(username);
  await logIn.password(password);
  await logIn.submit();

  await browser.waitUntil(
    async () => {
      const u = await browser.getUrl();
      if (u.includes('/ui') && !u.includes('login.jsp')) {
        return true;
      }
      // If still on login page, re-fill credentials and resubmit
      if (u.includes('login.jsp')) {
        try {
          await logIn.username(username);
          await logIn.password(password);
          await logIn.submit();
        } catch (e) {
          // page may have navigated away during retry — ignore
        }
      }
      return false;
    },
    {
      timeout: 30000,
      interval: 2000,
      timeoutMsg: 'UI did not load after login — still stuck on login.jsp',
    },
  );

  const ui = await UI.get();
  await ui.waitForVisible('nuxeo-page');
};
export default login;
