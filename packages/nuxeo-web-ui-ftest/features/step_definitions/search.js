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

Given(/^I have the following groups$/, (table) =>
  Promise.all(
    table.rows().map((row) =>
      fixtures.groups.create({
        'entity-type': 'group',
        groupname: row[0],
        grouplabel: row[1],
      }),
    ),
  ),
);

Given(/^I have the following users$/, (table) =>
  Promise.all(
    table.rows().map((row) =>
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

Given(/^I have the following documents$/, (table) => {
  browser.pause(1000);
  const tasks = table.hashes().map((row) => () => {
    const { doctype, title, creator, nature, subjects, coverage, path, collections, tag, file } = row;

    const doc = fixtures.documents.init(doctype, title);

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

Then('I can see that my saved search "{word}" on "{word}" is selected', function(savedSearchName, searchName) {
  this.ui.searchForm(searchName).menuButton.waitForVisible();
  const el = this.ui.searchForm(searchName).getSavedSearch(savedSearchName);
  el.waitForExist().should.be.true;
  el.getAttribute('class').should.equal('iron-selected');
});

When(/^I clear the (.+) search on (.+)$/, function(searchType, searchName) {
  const searchForm = this.ui.searchForm(searchName);
  searchForm.waitForVisible();
  searchForm.search(searchType);
});

When(/^I perform a (.+) search for (.+) on (.+)$/, function(searchType, searchTerm, searchName) {
  const searchForm = this.ui.searchForm(searchName);
  searchForm.waitForVisible();
  searchForm.search(searchType, searchTerm);
});

Then(/^I can see (\d+) search results$/, function(numberOfResults) {
  const { displayMode } = this.ui.results;
  if (numberOfResults === 0) {
    driver.waitUntil(
      () => this.ui.results.resultsCount(displayMode) === 0,
      `Expecting to get ${numberOfResults} results but found ${this.ui.results.resultsCount(displayMode)}`,
    );
    this.ui.results.noResults.waitForVisible().should.be.true;
  } else {
    this.ui.results.resultsCountLabel.waitForVisible();
    driver.waitUntil(
      () =>
        parseInt(this.ui.results.resultsCountLabel.getText(), 10) === numberOfResults &&
        this.ui.results.resultsCount(displayMode) === numberOfResults,
      `Expecting to get ${numberOfResults} results but found ${this.ui.results.resultsCount(displayMode)}`,
    );
  }
});

Then(/^I can see more than (\d+) search results$/, function(minNumberOfResults) {
  const { displayMode } = this.ui.results;
  driver.waitUntil(
    () => this.ui.results.resultsCount(displayMode) > minNumberOfResults,
    `Expecting to get more than ${minNumberOfResults} results but found ${this.ui.results.resultsCount(displayMode)}`,
  );
});

Then('I edit the results columns to show {string}', function(heading) {
  this.ui.results.actions.waitForVisible();
  if (this.ui.results.displayMode !== 'table' && this.ui.results.toggleTableView.isVisible()) {
    this.ui.results.toggleTableView.click();
  }
  this.ui.results.toggleColumnSettings.waitForVisible();
  this.ui.results.toggleColumnSettings.click();
  this.ui.results.getColumnCheckbox(heading).waitForExist();
  this.ui.results.checkColumnCheckbox(heading);
  this.ui.results.columnsCloseButton.click();
  this.ui.results.getResultsColumn(heading).waitForExist().should.be.true;
});

Then(/^I save my search as "(.+)"$/, function(searchName) {
  this.ui.searchResults.saveSearchAsButton.waitForVisible();
  this.ui.searchResults.saveSearchAsButton.click();
  this.ui.searchResults.enterInput(searchName);
  this.ui.searchResults.confirmSaveSearchButton.click();
});

Then(/^I share my "(.+)" search with (.+)/, function(searchName, username) {
  this.ui.searchResults.savedSearchActionButton.waitForVisible();
  this.ui.searchResults.savedSearchActionButton.click();
  this.ui.searchResults.shareAction.waitForVisible();
  this.ui.searchResults.shareAction.click();
  this.ui.searchForm(searchName).permissionsView.newPermissionButton.waitForVisible();
  this.ui.searchForm(searchName).permissionsView.newPermissionButton.click();
  this.ui.searchForm(searchName).permissionsView.setPermissions(username, {
    permission: 'Read',
    timeFrame: 'permanent',
    notify: false,
  });
  this.ui.searchForm(searchName).permissionsView.createPermissionButton.waitForVisible();
  this.ui.searchForm(searchName).permissionsView.createPermissionButton.click();
  this.ui
    .searchForm(searchName)
    .permissionsView.permission('Read', username, 'permanent')
    .waitForVisible();
});

Then(/^I can view my saved search "(.+)" on "(.+)"$/, function(savedSearchName, searchName) {
  this.ui.searchForm(searchName).menuButton.waitForVisible();
  this.ui.searchForm(searchName).menuButton.click();
  this.ui
    .searchForm(searchName)
    .getSavedSearch(savedSearchName)
    .waitForExist().should.be.true;
});

When(/^I click the QuickSearch button$/, function() {
  this.ui.searchButton.waitForVisible();
  this.ui.searchButton.click();
});

When(/^I perform a QuickSearch for (.+)/, function(searchTerm) {
  return this.ui.quickSearch.enterInput(searchTerm);
});

Then(/^I can see (\d+) QuickSearch results$/, function(numberOfResults) {
  driver.waitUntil(() => this.ui.quickSearch.quickSearchResultsCount() === numberOfResults);
});
