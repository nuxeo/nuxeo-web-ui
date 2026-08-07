import { Given, Then, When } from '@cucumber/cucumber';
import { url } from '../../pages/helpers.js';

Then('I can see the {string} search panel', function (name) {
  this.ui.drawer._search(name).waitForVisible();
});
Then('I can see the search results', function () {
  this.ui.search.waitForVisible().should.be.true;
});
Then('I cannot see the search results', function () {
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

Given(
  'I have a saved search named "{word}", for the "{word}" page provider, with the following parameters',
  async function (searchName, pageProvider, table) {
    const hashes = await table.hashes();
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
  },
);

Given('I have permission {word} for this saved search', function (permission) {
  return fixtures.savedSearches.setPermissions(this.savedSearch, permission, this.username);
});

When('I browse to the saved search', async function () {
  const savedSearchId = this.savedSearch.id;
  const resultsRendered = async () => {
    try {
      // Re-resolve the results page object each check: browser.results freezes the currently selected
      // pill into its selector, so it must be re-derived after navigation rather than captured once.
      const label = await (await this.ui.results).resultsCountLabel;
      if (!(await label.isExisting()) || !(await label.isDisplayed())) {
        return false;
      }
      // Require a positive count: "0 result(s)" means the view rendered but the saved search hasn't
      // applied (or returned nothing), which is the race this loop retries past.
      return parseInt((await label.getText()).trim(), 10) > 0;
    } catch (e) {
      return false;
    }
  };
  // Navigating to a saved search by id can intermittently land on a search page whose results view is
  // not yet wired to the search form, so the saved search is never applied and no results render. This
  // is a timing race that surfaces more often on recent Chrome versions and under CI load. Two attempts
  // is the most that fits the Cucumber step timeout, keeping the final throw reachable.
  const maxAttempts = 2;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      console.warn(
        `Saved search ${savedSearchId} results not rendered; re-navigating (attempt ${attempt + 1}/${maxAttempts})`,
      );
      await url('#!/');
    }
    await url(`#!/doc/${savedSearchId}`);
    try {
      await driver.waitUntil(resultsRendered, { timeout: 10000, interval: 500 });
      return;
    } catch (e) {
      // results did not render on this attempt — re-navigate and retry
    }
  }
  throw new Error(`Saved search ${savedSearchId} did not render any results after ${maxAttempts} navigation attempts`);
});

Then('I can see that my saved search "{word}" on "{word}" is selected', async function (savedSearchName, searchName) {
  const ui = await this.ui;
  const searchForm = await ui.searchForm(searchName);
  const dropdownBtn = await searchForm.nuxeoSelect;
  await dropdownBtn.click();
  const dropdown = dropdownBtn.shadow$('div.selectivity-dropdown');
  await dropdown.waitForExist();
  const savedSearch = await searchForm.getSavedSearch(savedSearchName);
  const savedSearchExist = await savedSearch.waitForExist();
  savedSearchExist.should.be.true;
  const classAttr = await savedSearch.getAttribute('class');
  classAttr.should.include('highlight');
});

When(/^I clear the (.+) search on (.+)$/, async function (searchType, searchName) {
  const searchForm = await this.ui.searchForm(searchName);
  await searchForm.waitForVisible();
  await searchForm.search(searchType);
});

When(/^I perform a (.+) search for (.+) on (.+)$/, async function (searchType, searchTerm, searchName) {
  const searchForm = await this.ui.searchForm(searchName);
  await searchForm.waitForVisible();
  // Wait for the form's internal elements to be ready (shadow DOM rendering)
  await driver.waitUntil(
    async () => {
      try {
        const el = await searchForm.el;
        return el && (await el.isDisplayed());
      } catch (e) {
        return false;
      }
    },
    { timeout: 10000, interval: 500 },
  );
  await searchForm.search(searchType, searchTerm);
});

When('I switch to filter view', async function () {
  await driver.pause(1000);
  const filterView = await this.ui.filterView;
  await filterView.click();
  await driver.pause(1000);
});

Then(/^I can see (\d+) search results$/, async function (numberOfResults) {
  await driver.pause(1000);
  const uiResult = await this.ui.results;
  const displayMode = await uiResult.displayMode;
  if (numberOfResults === 0) {
    await driver.waitUntil(
      async () => {
        const count = await uiResult.resultsCount(displayMode);
        return count === numberOfResults;
      },
      { timeout: 20000, interval: 2000, timeoutMsg: `Expected 0 results but count never reached 0` },
    );
    const emptyResult = await uiResult.noResults;
    const emptyResultVisible = await emptyResult.waitForVisible();
    emptyResultVisible.should.be.true;
  } else {
    let lastSeen = 'n/a';
    try {
      await driver.waitUntil(
        async () => {
          try {
            const outLabel = await uiResult.resultsCountLabel;
            if ((await outLabel.isExisting()) && (await outLabel.isDisplayed())) {
              const outText = await outLabel.getText();
              lastSeen = outText;
              if (parseInt(outText, 10) === numberOfResults) return true;
            }
            // Count doesn't match yet (or the label isn't shown): nudge the page provider to refetch,
            // covering Elasticsearch indexing / refresh lag. Runs on every poll, including before the
            // label first appears.
            const el = await uiResult.el;
            await driver.execute((r) => {
              const pp = r && r.querySelector('nuxeo-page-provider');
              if (pp && pp.fetch) pp.fetch();
            }, el);
            return false;
          } catch (e) {
            return false;
          }
        },
        { timeout: 30000, interval: 2000 },
      );
    } catch (e) {
      throw new Error(`Expected ${numberOfResults} in results count label (last seen: "${lastSeen}")`, { cause: e });
    }
    // The label wait above already asserts the exact total; a DOM-row recount here would only re-check
    // the virtualized on-screen window and fail for counts larger than the rendered slice.
  }
});

Then(/^I can see more than (\d+) search results$/, async function (minNumberOfResults) {
  await driver.pause(1000);
  const results = await this.ui.results;
  const displayMode = await results.displayMode;
  const min = parseInt(minNumberOfResults, 10);
  let output = 'n/a';
  // Read the results count label rather than counting rendered rows: the result list is virtualized
  // (iron-list only keeps a small window of rows in the DOM), so counting DOM rows caps at the on-screen
  // window. After clearing a filter the results also re-fetch asynchronously, so nudge the page provider
  // to refetch to cover Elasticsearch indexing / refresh lag while waiting for the label to update.
  await driver
    .waitUntil(
      async () => {
        try {
          const outLabel = await results.resultsCountLabel;
          if (!(await outLabel.isExisting()) || !(await outLabel.isDisplayed())) {
            return false;
          }
          output = parseInt(await outLabel.getText(), 10);
          if (output > min) {
            return true;
          }
          const el = await results.el;
          await driver.execute((r) => {
            const pp = r && r.querySelector('nuxeo-page-provider');
            if (pp && pp.fetch) pp.fetch();
          }, el);
        } catch (e) {
          // best-effort refresh
        }
        return false;
      },
      // No timeoutMsg here: it is evaluated when waitUntil is called (output === 'n/a') and would report
      // a stale value. Rethrow below with the last observed count instead.
      { timeout: 20000, interval: 2000 },
    )
    .catch((e) => {
      throw new Error(`Expecting to get more than ${min} but found ${output}`, { cause: e });
    });
  // Guard against a page provider reporting a count over an empty list: ensure rows actually rendered.
  if ((await results.resultsCount(displayMode)) === 0) {
    throw new Error(`Results count label reports more than ${min} but no rows rendered`);
  }
  return true;
});

Then('I edit the results columns to show {string}', async function (heading) {
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
  await driver.pause(2000);
  await searchResults.enterInput(searchName);
  await driver.pause(2000);
  const confirmSaveButton = await searchResults.confirmSaveSearchButton;
  await confirmSaveButton.click();
});

Then(/^I share my "(.+)" search with (.+)/, async function (searchName, username) {
  const savedSearch = await this.ui.searchResults;
  const savedSearchButton = await savedSearch.savedSearchActionButton;
  await savedSearchButton.waitForVisible();
  await savedSearchButton.click();
  const shareActionButton = await savedSearch.shareAction;
  await shareActionButton.waitForVisible();
  await shareActionButton.click();
  const searchForm = await this.ui.searchForm(searchName);
  const permissionView = await searchForm.permissionsView;
  const permissionButton = await permissionView.newPermissionButton;
  await permissionButton.waitForVisible();
  await permissionButton.click();
  await permissionView.setPermissions(username, {
    permission: 'Read',
    timeFrame: 'permanent',
    notify: false,
  });
  const createPermissionButton = await permissionView.createPermissionButton;
  await createPermissionButton.waitForVisible();
  await createPermissionButton.click();
  const permissionVisible = await permissionView.permission('Read', username, 'permanent');
  const isVisible = await permissionVisible.waitForVisible();
  isVisible.should.be.true;
});

Then(/^I can view my saved search "(.+)" on "(.+)"$/, async function (savedSearchName, searchName) {
  const searchForm = await this.ui.searchForm(searchName);
  const dropdownBtn = await searchForm.nuxeoSelect;
  await dropdownBtn.click();
  const dropdown = dropdownBtn.shadow$('div.selectivity-dropdown');
  await dropdown.waitForExist();
  const savedSearch = await searchForm.getSavedSearch(savedSearchName);
  const savedSearchExist = await savedSearch.waitForExist();
  savedSearchExist.should.be.true;
});

When(/^I click the QuickSearch button$/, async function () {
  const button = await this.ui.searchButton;
  await button.waitForVisible();
  await button.click();
});

When(/^I perform a QuickSearch for (.+)/, async function (searchTerm) {
  const quickSearch = await this.ui.quickSearch;
  await quickSearch.enterInput(searchTerm);
});

Then(/^I can see (\d+) QuickSearch results$/, async function (numberOfResults) {
  const quickSearch = await this.ui.quickSearch;
  await driver.pause(1000);
  const result = await quickSearch.quickSearchResultsCount();
  if (result !== numberOfResults) {
    throw new Error(`Expecting to get ${numberOfResults} results but found ${result}`);
  }
});
