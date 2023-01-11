import { Then } from '@cucumber/cucumber';

Then('I can see the {string} collection',async function(name) {
  const isVisible = await this.ui.drawer.collections.waitForHasCollection(name);
  if (!isVisible) {
    throw new Error(`Expected ${name} collection to be visible`);
  }
});

Then('I can click on the {string} collection', function(name) {
  const isVisible = await this.ui.drawer.collections.select(name);
  if (!isVisible) {
    throw new Error(`Expected ${name} collection to be clicked`);
  }
});

Then('I can see that the document belongs to the collection', function() {
  const isVisible = await this.ui.browser.waitForHasChild(this.doc);
  if (!isVisible) {
    throw new Error('Expected document belong to collection');
  }
});

Then('I can click the document in the collection', function() {
  const isVisible = await this.ui.browser.clickChild(this.doc.title);
  if (!isVisible) {
    throw new Error('Expected document to be clicked');
  }
});

Then('I can see the collection is in queue mode', function() {
  const isVisible = await this.ui.drawer.collections.isQueueMode;
  if (!isVisible) {
    throw new Error('Expected collection to be visible');
  }
});

Then('I can see the collection queue has the document', function() {
  const isVisible = await this.ui.drawer.collections.waitForHasMember(this.doc);
  if (!isVisible) {
    throw new Error('Expected collection queue has document');
  }
});

Then('I can remove the document from the collection queue', function() {
  const isVisible = await this.ui.drawer.collections.removeMember(this.doc);
  if (!isVisible) {
    throw new Error('Expected document is removed');
  }
});

Then('I can see the collection queue does not have the document', function() {
  const isVisible = await this.ui.drawer.collections.waitForHasMember(this.doc, true);
  if (isVisible) {
    throw new Error('Expected collection queue does not have document');
  }
});
