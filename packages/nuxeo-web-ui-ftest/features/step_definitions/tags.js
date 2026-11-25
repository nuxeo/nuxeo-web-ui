import { Then, When } from '@cucumber/cucumber';

When('I paste {string} in the document tags', async function (text) {
  const page = await this.ui.browser.documentPage(this.doc.type);
  const tags = await page.tags;
  await tags.waitForVisible();
  const input = await tags.element('.selectivity-multiple-input');
  await input.click();
  // Headless browsers have no usable clipboard, so fill the input and fire the paste event selectivity listens to.
  await driver.execute(
    (el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('paste', { bubbles: true, composed: true }));
    },
    input,
    text,
  );
  // The chips show up right away; the success toast only opens once the tags are saved.
  await driver.waitUntil(() => driver.execute((el) => el.$.toast.opened, tags), {
    timeoutMsg: 'The pasted tags were not saved',
  });
});

Then('I can see the document has the tags {string}', async function (expected) {
  const page = await this.ui.browser.documentPage(this.doc.type);
  const tags = await page.tags;
  await tags.waitForVisible();
  // The server does not keep the tags in the order they were added, so compare them regardless of order.
  const sorted = (labels) => [...labels].sort().join(',');
  const expectedTags = sorted(expected.split(','));
  let actual;
  try {
    await driver.waitUntil(async () => {
      const items = await tags.elements('.selectivity-multiple-selected-item');
      const labels = [];
      for (let i = 0; i < items.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        labels.push((await items[i].getText()).trim());
      }
      actual = sorted(labels);
      return actual === expectedTags;
    });
  } catch (e) {
    throw new Error(`Expected the document tags to be "${expectedTags}" but got "${actual}"`, { cause: e });
  }
});
