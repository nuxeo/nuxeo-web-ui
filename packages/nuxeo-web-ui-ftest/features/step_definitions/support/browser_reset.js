import { After, Status } from '@cucumber/cucumber';

/**
 * After each scenario, ensure the browser is in a clean state so that failures
 * in one scenario/feature do not cascade to subsequent ones.
 *
 * Runs BEFORE other After hooks (order: higher = earlier in Cucumber).
 * Dismisses stale alerts, clears session storage, and navigates to the login
 * page so the next scenario starts from a known baseline.
 */
After({ order: 10000 }, async (scenario) => {
  const { status } = scenario.result;
  if (status !== Status.PASSED) {
    // Dismiss any open alert/confirm/prompt dialogs that block further navigation
    try {
      await browser.dismissAlert();
    } catch (e) {
      // No alert open — expected in most cases
    }

    // Clear session storage to avoid stale client-side state
    try {
      await browser.execute(() => {
        try {
          window.sessionStorage.clear();
        } catch (err) {
          // cross-origin or restricted context
        }
      });
    } catch (e) {
      // page may be unresponsive
    }

    // Navigate to logout to reset server session, ensuring a fresh login for the next scenario
    try {
      const baseUrl = process.env.NUXEO_URL || '';
      const logoutUrl = baseUrl ? `${baseUrl}/logout` : 'logout';
      await browser.url(logoutUrl);
      // Give the server a moment to process the logout
      await browser.waitUntil(async () => !(await browser.$$('nuxeo-app')).length, {
        timeout: 10000,
        interval: 500,
      });
    } catch (e) {
      // If navigation itself fails, try a hard reload as last resort
      try {
        await browser.reloadSession();
        await browser.maximizeWindow();
      } catch (err) {
        // Nothing more we can do
      }
    }
  }
});
