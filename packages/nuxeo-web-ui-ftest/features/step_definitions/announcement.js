import { After, Before, Given, Then, When } from '@cucumber/cucumber';
import AnnouncementBanner from '../../pages/ui/announcementBanner.js';
import nuxeo from './support/services/client.js';

const announcementDirectory = nuxeo.directory('webUIAnnouncement');
let originalAnnouncement;

const isNotFound = (err) => err.response?.status === 404;

Before({ tags: '@announcement' }, async () => {
  try {
    const entry = await announcementDirectory.fetch('announcement');
    originalAnnouncement = {
      id: entry.id || entry.properties.id,
      properties: { ...entry.properties },
    };
  } catch (err) {
    if (!isNotFound(err)) {
      throw err;
    }
    originalAnnouncement = null;
  }
});

After({ tags: '@announcement', order: 100 }, async () => {
  try {
    if (originalAnnouncement) {
      await announcementDirectory.update(originalAnnouncement);
    } else {
      await announcementDirectory.delete('announcement');
    }
  } catch (err) {
    if (!isNotFound(err)) {
      throw err;
    }
  }
});

Given('I am on the announcement page', async function () {
  await this.ui.administration.goToAnnouncement();
});

Given('the announcement banner is turned off', async function () {
  const page = await this.ui.administration.announcement;
  await page.waitForVisible();
  await page.setEnabled(false);
  await page.save();
  await AnnouncementBanner.waitForDisplayed(true);
});

Then('I can see the announcement page', async function () {
  const page = await this.ui.administration.announcement;
  const isVisible = await page.waitForVisible();
  if (!isVisible) {
    throw new Error('Expected announcement page to be visible');
  }
});

When('I enable the announcement banner with message {string}', async function (message) {
  const page = await this.ui.administration.announcement;
  await page.setEnabled(true);
  await page.fillMessage(message);
  await page.save();
});

When('I enable the announcement banner with message {string} and link {string}', async function (message, linkUrl) {
  const page = await this.ui.administration.announcement;
  await page.setEnabled(true);
  await page.fillMessage(message);
  await page.fillLink(linkUrl);
  await page.save();
});

When('I disable the announcement banner', async function () {
  const page = await this.ui.administration.announcement;
  await page.setEnabled(false);
  await page.save();
});

Then('I can see the announcement banner with message {string}', async (message) => {
  await AnnouncementBanner.waitForMessage(message);
});

Then('I cannot see the announcement banner', async () => {
  await AnnouncementBanner.waitForDisplayed(true);
});

Then('the announcement banner has a link to {string}', async (linkUrl) => {
  await AnnouncementBanner.waitForDisplayed();
  const href = await AnnouncementBanner.linkHref();
  if (href !== linkUrl) {
    throw new Error(`Expected the announcement banner link to point to "${linkUrl}" but got "${href}"`);
  }
});
