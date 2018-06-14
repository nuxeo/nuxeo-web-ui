'use strict';

module.exports = function () {
  this.Then('I can see the "$name" search panel', (name) => this.ui.drawer._search(name).waitForVisible());
  this.Then('I can see the search results', () => this.ui.search.waitForVisible().should.be.true);
  this.Then('I cannot see the search results', () => this.ui.search
      .waitForVisible(browser.options.waitforTimeout, true).should.be.true);
  this.Given(/^I have the following groups$/, (table) => {
    const promises = [];
    table.rows().map((row) => {
      promises.push(fixtures.groups.create(
        {
          'entity-type': 'group',
          groupname: row[0],
          grouplabel: row[1],
        }));
    });
    return Promise.all(promises);
  });
  this.Given(/^I have the following users$/, (table) => {
    const promises = [];
    table.rows().map((row) => {
      promises.push(fixtures.users.create(
        {
          'entity-type': 'user',
          properties: {
            username: row[0],
            firstName: row[1],
            lastName: row[2],
            password: fixtures.users.DEFAULT_PASSWORD,
            groups: row[3],
          },
        }));
    });
    return Promise.all(promises);
  });
  this.Given(/^I have the following documents$/, (table) => {
    browser.pause(1000);
    const tasks = table.rows().map((row) => () => {
      const doc = fixtures.documents.init(row[0]);
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
  this.When(/^I clear the (.+) search on (.+)$/, (searchType, searchName) => {
    this.ui.searchForm(searchName).search(searchType);
  });
  this.When(/^I perform a (.+) search for (.+) on (.+)$/, (searchType, searchTerm, searchName) => {
    this.ui.searchForm(searchName).search(searchType, searchTerm);
  });
  this.Then(/^I can see (\d+) search results$/, (numberOfResults) => {
    const displayMode = this.ui.results.displayMode;
    if (numberOfResults === '0') {
      this.ui.results.noResults.waitForVisible().should.be.true;
    } else {
      this.ui.results.getResults(displayMode).waitForVisible();
      this.ui.results.resultsCount(displayMode).toString().should.equal(numberOfResults);
    }
  });
  this.Then(/^I can see more than (\d+) search results$/, (minNumberOfResults) => {
    const displayMode = this.ui.results.displayMode;
    if (minNumberOfResults === '0') {
      this.ui.results.noResults.waitForVisible().should.be.true;
    } else {
      this.ui.results.getResults(displayMode).waitForVisible();
      this.ui.results.resultsCount(displayMode).should.be.above(parseInt(minNumberOfResults));
    }
  });
  this.Then(/^I edit the results columns to show (.+)$/, (heading) => {
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
  this.Then(/^I save my search as "(.+)"$/, (searchName) => {
    this.ui.searchResults.saveSearchAsButton.waitForVisible();
    this.ui.searchResults.saveSearchAsButton.click();
    this.ui.searchResults.enterInput(searchName);
    this.ui.searchResults.confirmSaveSearchButton.click();
  });
  this.Then(/^I share my "(.+)" search with (.+)/, (searchName, username) => {
    this.ui.searchResults.savedSearchActionButton.waitForVisible();
    this.ui.searchResults.savedSearchActionButton.click();
    this.ui.searchResults.shareAction.waitForVisible();
    this.ui.searchResults.shareAction.click();
    this.ui.searchForm(searchName).permissionsView.newPermissionButton.waitForVisible();
    this.ui.searchForm(searchName).permissionsView.newPermissionButton.click();
    this.ui.searchForm(searchName).permissionsView.setPermissions(username,
      {
        permission: 'Read',
        timeFrame: 'permanent',
        notify: false,
      }
    );
    this.ui.searchForm(searchName).permissionsView.createPermissionButton.waitForVisible();
    this.ui.searchForm(searchName).permissionsView.createPermissionButton.click();
    this.ui.searchForm(searchName).permissionsView.permission('Read', username, 'permanent').waitForVisible();
  });
  this.Then(/^I can view my saved search "(.+)" on "(.+)"$/, (savedSearchName, searchName) => {
    this.ui.searchForm(searchName).menuButton.waitForVisible();
    this.ui.searchForm(searchName).menuButton.click();
    this.ui.searchForm(searchName).getSavedSearch(savedSearchName).waitForExist().should.be.true;
  });
  this.When(/^I click the QuickSearch button$/, () => {
    this.ui.searchButton.waitForVisible();
    this.ui.searchButton.click();
  });
  this.When(/^I perform a QuickSearch for (.+)/, (searchTerm) => {
    this.ui.quickSearch.enterInput(searchTerm);
  });
  this.Then(/^I can see (\d+) QuickSearch results$/, (numberOfResults) => {
    this.ui.quickSearch.quickSearchResults.waitForVisible();
    this.ui.quickSearch.quickSearchResultsCount().toString().should.equal(numberOfResults);
  });
};
