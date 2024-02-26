import { Then } from '@cucumber/cucumber';

Then('I can see the {string} collection', async function(name) {
  const collection = await this.ui.drawer.collections.waitForHasCollection(name);
  if (!collection) {
    throw new Error(`Expected I can not click on the ${name} collection`);
  }
});

Then('I can click on the {string} collection', async function(name) {
  const myCollection = await this.ui.drawer;
  const collectionsEle = await myCollection.collections;
  const selectEle = await collectionsEle.select(name);
  if (!selectEle) {
    throw new Error(`Expected I can not click on the ${name} collection`);
  }
});

Then('I can see that the document belongs to the collection', async function() {
  const browser = await this.ui.browser;
  const hasChild = await browser.waitForHasChild(this.doc);
  if (!hasChild) {
    throw new Error('Expected the document belongs to the collection not be visible');
  }
});

Then('I can click the document in the collection', async function() {
  const browserEle = await this.ui.browser;
  const clickDocument = await browserEle.clickChild(this.doc.title);
  if (!clickDocument) {
    throw new Error('Expected I cannot click the document in the collection');
  }
});

Then('I can see the collection is in queue mode', async function() {
  const drawerEle = await this.ui.drawer;
  const collectionsEle = await drawerEle.collections;
  const isQueueModeEle = await collectionsEle.isQueueMode;
  if (!isQueueModeEle) {
    throw new Error('Expected the collection is in queue mode is not visible');
  }
});

Then('I can see the collection queue has the document', async function() {
  const drawerEle = await this.ui.drawer;
  const collectionsEle = await drawerEle.collections;
  const hasMemberEle = await collectionsEle.waitForHasMember(this.doc);
  if (!hasMemberEle) {
    throw new Error('Expected the collection queue has the document is not visible');
  }
});

Then('I can remove the document from the collection queue', async function() {
  const draweerEle = await this.ui.drawer;
  const collectionsEle = await draweerEle.collections;
  const removeMemberEle = await collectionsEle.removeMember(this.doc);
  if (!removeMemberEle) {
    throw new Error('Expected I can not remove the document from the collection queue');
  }
});

Then('I can see the collection queue does not have the document', async function() {
  const drawerEle = await this.ui.drawer;
  const collectionsEle = await drawerEle.collections;
  const hasMemberEle = await collectionsEle.waitForHasMember(this.doc, true);
  if (!hasMemberEle) {
    throw new Error('Expected the collection queue does not have the document is not visible');
  }
});
