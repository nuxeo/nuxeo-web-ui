import { Given, Then, When } from 'cucumber';

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
  const tasks = table.rows().map((row) => () => {
    const doc = fixtures.documents.init(row[0]);
    // eslint-disable-next-line prefer-destructuring
    doc.name = row[1];
    doc.properties = {
      'dc:title': row[1],
      'dc:nature': row[2],
      'dc:subjects': [row[3]],
      'dc:coverage': row[4],
    };
    if (row[0] === 'Note') {
      doc.properties = {
        'dc:title': row[1],
        'dc:nature': row[2],
        'dc:subjects': [row[3]],
        'dc:coverage': row[4],
        'note:note': 'Lorem Ipsum',
      };
    }
    // create the document
    return fixtures.documents.createWithAuthor(row[6], doc, row[5]).then((docWithAuthor) => {
      if (row[7].length > 0) {
        return fixtures.collections.addToCollection(docWithAuthor, row[7]).then((docInCollection) => {
          if (row[8].length > 0) {
            return fixtures.documents.addTag(docInCollection, row[8]).then((docWithTag) => {
              if (row[9].length > 0) {
                return fixtures.documents.attach(docWithTag, fixtures.blobs.get(row[9]));
              }
            });
          }
        });
      }
    });
  });
  return tasks.reduce((current, next) => current.then(next), Promise.resolve([]));
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
    this.ui.results.getResults(displayMode).waitForVisible();
    driver.waitUntil(
      () => this.ui.results.resultsCount(displayMode) === numberOfResults,
      `Expecting to get ${numberOfResults} results but found ${this.ui.results.resultsCount(displayMode)}`,
    );
  }
});

Then(/^I can see more than (\d+) search results$/, function(minNumberOfResults) {
  const { displayMode } = this.ui.results;
  this.ui.results.getResults(displayMode).waitForVisible();
  driver.waitUntil(
    () => this.ui.results.resultsCount(displayMode) > minNumberOfResults,
    `Expecting to get more than ${minNumberOfResults} results but found ${this.ui.results.resultsCount(displayMode)}`,
  );
});

Then(/^I edit the results columns to show (.+)$/, function(heading) {
  this.ui.results.resultActions.waitForVisible();
  if (this.ui.results.toggleTableView.isVisible()) {
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
  this.ui.quickSearch.quickSearchResults.waitForVisible();
  this.ui.quickSearch.quickSearchResultsCount().should.equal(numberOfResults);
});
