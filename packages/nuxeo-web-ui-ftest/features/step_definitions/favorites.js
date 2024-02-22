// eslint-disable-next-line import/no-extraneous-dependencies
import { Then } from '@cucumber/cucumber';

Then('I can see the document belongs to the favorites', async function() {
  const drawerEle = await this.ui.drawer;
  const favEle = await drawerEle.favorites;
  await favEle.hasDocument(this.doc);
});

Then('I can remove the document from the favorites', async function() {
  const drawerEle = await this.ui.drawer;
  const favorites = await drawerEle.favorites;
  await favorites.removeDocument(this.doc);
});
