export default class Login {
  async username(username) {
    const inputUserName = await $('#username');
    await inputUserName.waitForDisplayed({ timeout: 10000 });
    await inputUserName.setValue(username);
  }

  async password(password) {
    const inputPassword = await $('#password');
    await inputPassword.waitForDisplayed({ timeout: 10000 });
    await inputPassword.setValue(password);
  }

  async submit() {
    const submitButton = await $('[name="Submit"]');
    await submitButton.click();
  }

  static async get() {
    const baseUrl = process.env.NUXEO_URL || '';
    
    console.log("🔵 FORCING CLEAN SESSION");
    await browser.deleteCookies();
    await browser.reloadSession();

    const loginUrl = baseUrl ? `${baseUrl}/logout` : 'logout';

    console.log("🔵 Navigating to login:", loginUrl);
    await browser.url(loginUrl);

    // Wait until browser is idle and page is ready
    await browser.waitUntil(
      async () => !(await $$('nuxeo-app')).length,
      {
        timeout: 10000,
        interval: 200,
        timeoutMsg: 'nuxeo-app did not unload after logout'
      }
    );

    // wait for login form to appear
    console.log("🔵 Waiting for #username");
    await $('#username').waitForDisplayed({ timeout: 30000 });
    console.log("🟢 Login screen ready");

    return new this();
  }
}
