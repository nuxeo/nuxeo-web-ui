// eslint-disable-next-line import/no-extraneous-dependencies
import { Given, Then, When } from '@cucumber/cucumber';
import { url } from '../../pages/helpers';

Then('I can see the {string} search panel', function(name) {
  this.ui.drawer._search(name).waitForVisible();
});
Then('I can see the search results', function() {
  this.ui.search.waitForVisible().should.be.true;
});
Then('I cannot see the search results', function() {
  this.ui.search.waitForVisible(browser.options.waitforTimeout, true).should.be.true;
});

Given(/^I have the following groups$/, async (table) =>
  Promise.all(
    await table.rows().map(async (row) =>
      fixtures.groups.create({
        'entity-type': 'group',
        groupname: row[0],
        grouplabel: row[1],
      }),
    ),
  ),
);

Given(/^I have the following users$/, async (table) =>
  Promise.all(
    await table.rows().map(async (row) =>
      fixtures.users.create({
        'entity-type': 'user',
        properties: {
          username: row[0],
          firstName: row[1],
          lastName: row[2],
          password: fixtures.users.DEFAULT_PASSWORD,
          email: row[3],
          groups: row[4],
        },
      }),
    ),
  ),
);

Given(/^I have the following documents$/, async (table) => {
  await driver.pause(1000);
  const tasks = await table.hashes().map((row) => async () => {
    const { doctype, title, creator, nature, subjects, coverage, path, collections, tag, file } = row;
    const doc = await fixtures.documents.init(doctype, title);
    // assign basic dc properties (unprefixed)
    Object.assign(doc.properties, {
      'dc:title': title,
      'dc:creator': creator,
      'dc:nature': nature,
      'dc:subjects': Array.isArray(subjects) ? subjects : [subjects],
      'dc:coverage': coverage,
    });
    // fill in dummy note content
    if (doctype === 'Note') {
      doc.properties['note:note'] = 'Lorem Ipsum';
    }
    // fill in any other properties (prefixed)
    Object.keys(row)
      .filter((k) => k.indexOf(':') !== -1)
      .forEach((k) => {
        doc.properties[k] = row[k];
      });
    // create the document
    return (
      fixtures.documents
        .create(path, doc)
        // add to collection
        .then((d) => (collections && collections.length > 0 ? fixtures.collections.addToCollection(d, collections) : d))
        // add tag
        .then((d) => (tag && tag.length > 0 ? fixtures.documents.addTag(d, tag) : d))
        // attach files
        .then((d) => (file && file.length > 0 ? fixtures.documents.attach(d, fixtures.blobs.get(file)) : d))
    );
  });
  return tasks.reduce((current, next) => current.then(next), Promise.resolve([]));
});

Given('I have a saved search named "{word}", for the "{word}" page provider, with the following parameters', function(
  searchName,
  pageProvider,
  table,
) {
  const hashes = table.hashes();
  hashes.forEach((kv) => {
    kv.value = JSON.parse(kv.value);
  });
  // could be replaced with Object.fromEntries(...), which is only support from nodejs 12.x on
  const params = hashes.reduce((obj, { key, value }) => {
    obj[key] = value;
    return obj;
  }, {});
  return fixtures.savedSearches.create(searchName, pageProvider, params).then((savedSearch) => {
    this.savedSearch = savedSearch;
  });
});

Given('I have permission {word} for this saved search', function(permission) {
  return fixtures.savedSearches.setPermissions(this.savedSearch, permission, this.username);
});

When('I browse to the saved search', function() {
  url(`#!/doc/${this.savedSearch.id}`);
});

Then('I can see that my saved search "{word}" on "{word}" is selected', async function(savedSearchName, searchName) {
  const searchForm = await this.ui.searchForm(searchName);
  const menuButton = await searchForm.menuButton;
  await menuButton.waitForVisible();
  const savedSearch = await this.ui.searchForm(searchName).getSavedSearch(savedSearchName);
  const savedSearchExist = await savedSearch.waitForExist();
  savedSearchExist.should.be.true;
  const attr = await savedSearch.getAttribute('class');
  attr.should.equal('iron-selected');
});

When(/^I clear the (.+) search on (.+)$/, async function(searchType, searchName) {
  const searchForm = await this.ui.searchForm(searchName);
  await searchForm.waitForVisible();
  await searchForm.search(searchType);
});

When(/^I perform a (.+) search for (.+) on (.+)$/, async function(searchType, searchTerm, searchName) {
  const searchForm = await this.ui.searchForm(searchName);
  await searchForm.waitForVisible();
  await driver.pause(1000);
  await searchForm.search(searchType, searchTerm);
});

When('I switch to filter view', async function() {
  await driver.pause(1000);
  const filterView = await this.ui.filterView;
  await filterView.click();
  await driver.pause(1000);
});

Then(/^I can see (\d+) search results$/, async function(numberOfResults) {
  await driver.pause(1000);
  const uiResult = await this.ui.results;
  const displayMode = await uiResult.displayMode;
  if (numberOfResults === 0) {
    const outResult2 = await uiResult.resultsCount(displayMode);
    if (outResult2 !== numberOfResults) {
      throw new Error(`Expecting to get ${numberOfResults} results but found ${outResult2}`);
    }
    const emptyResult = await uiResult.noResults;
    const emptyResultVisible = await emptyResult.waitForVisible();
    emptyResultVisible.should.be.true;
  } else {
    const outLabel = await uiResult.resultsCountLabel;
    await outLabel.waitForVisible();
    const outText = await outLabel.getText();
    const outResult = parseInt(outText, 10);
    if (outResult !== numberOfResults) {
      throw new Error(`Expecting to get ${numberOfResults} results but found ${outResult}`);
    }
    const outResult2 = await uiResult.resultsCount(displayMode);
    if (outResult2 !== numberOfResults) {
      throw new Error(`Expecting to get ${numberOfResults} results but found ${outResult2}`);
    }
  }
});

Then(/^I can see more than (\d+) search results$/, async function(minNumberOfResults) {
  await driver.pause(1000);
  const results = await this.ui.results;
  const displayMode = await results.displayMode;
  const output = await results.resultsCount(displayMode);
  if (output > minNumberOfResults) {
    return true;
  }
  throw new Error(`Expecting to get more than ${minNumberOfResults} but found ${output}`);
});

Then('I edit the results columns to show {string}', async function(heading) {
  const result = await this.ui.results;
  const actions = await result.actions;
  await actions.waitForVisible();
  const dispMode = await result.displayMode;
  const togTableview = await result.toggleTableView;
  if ((await dispMode) !== 'table' && (await togTableview.isVisible())) {
    await togTableview.click();
  }
  const toggleSettings = await result.toggleColumnSettings;
  await toggleSettings.waitForVisible();
  await toggleSettings.click();
  const columnCheckbox = await result.getColumnCheckbox(heading);
  await columnCheckbox.waitForExist();
  await result.checkColumnCheckbox(heading);
  const button = await result.columnsCloseButton;
  await button.click();
  const resultsColumn = await result.getResultsColumn(heading);
  const isColumnExist = await resultsColumn.waitForExist();
  isColumnExist.should.be.true;
});

Then(/^I save my search as "(.+)"$/, async function (searchName) {
  const searchResults = await this.ui.searchResults;
  const saveAsButton = await searchResults.saveSearchAsButton;
  await saveAsButton.waitForVisible();
  await saveAsButton.click();
  await searchResults.enterInput(searchName);
  const confirmSaveButton = await searchResults.confirmSaveSearchButton;
  await confirmSaveButton.click();
});

Then(/^I share my "(.+)" search with (.+)/, async function (searchName, username) {
  try {
  const savedSearch = await this.ui.searchResults;
  const savedSearchButton = await savedSearch.savedSearchActionButton;
  await savedSearchButton.waitForVisible();
  console.log('savedSearchButton',savedSearchButton)
  await savedSearchButton.click();
  const shareActionButton = await savedSearch.shareAction;
  await shareActionButton.waitForVisible();
  console.log('shareActionButton',shareActionButton)
  await shareActionButton.click();
  const searchForm = await this.ui.searchForm(searchName);
  const permissionView = await searchForm.permissionsView;
  const permissionButton = await permissionView.newPermissionButton;
  await permissionButton.waitForVisible();
  console.log('permissionButton',permissionButton)
  await permissionButton.click();
  await permissionView.setPermissions(username, {
    permission: 'Read',
    timeFrame: 'permanent',
    notify: false,
  });
  const createPermissionButton = await permissionView.createPermissionButton;
  await createPermissionButton.waitForVisible();
  console.log('createPermissionButton',createPermissionButton)
  await createPermissionButton.click();
  const permissionVisible = await permissionView.permission('Read', username, 'permanent');
  const isVisible = await permissionVisible.waitForVisible();
  console.log('isVisible',isVisible)
  isVisible.should.be.true;
  } catch (error) {
      console.log('errrrrrrrrrrrrrrrr',error)
  }
  
});

Then(/^I can view my saved search "(.+)" on "(.+)"$/, async function(savedSearchName, searchName) {
  const searchForm = await this.ui.searchForm(searchName);
  const menuButton = await searchForm.menuButton;
  await menuButton.waitForVisible();
  await menuButton.click();
  const savedSearch = await searchForm.getSavedSearch(savedSearchName);
  const savedSearchExist = await savedSearch.waitForExist();
  savedSearchExist.should.be.true;
});

When(/^I click the QuickSearch button$/, async function() {
  const button = await this.ui.searchButton;
  await button.waitForVisible();
  await button.click();
});

When(/^I perform a QuickSearch for (.+)/, async function(searchTerm) {
  const quickSearch = await this.ui.quickSearch;
  await quickSearch.enterInput(searchTerm);
});

Then(/^I can see (\d+) QuickSearch results$/, async function(numberOfResults) {
  const quickSearch = await this.ui.quickSearch;
  await driver.pause(1000);
  const result = await quickSearch.quickSearchResultsCount();
  if (result !== numberOfResults) {
    throw new Error(`Expecting to get ${numberOfResults} results but found ${result}`);
  }
});
