import BasePage from '../base';

export default class Group extends BasePage {
  getField(field) {
    $(this._selector).waitForVisible();
    return this.el.element(`[id="${field}"]`);
  }

  get dropdown() {
    return this.el.element('#menu');
  }

  get groupItem() {
    return this.el.element('paper-icon-item[name="group"]');
  }

  get createGroupForm() {
    return this.el.element('nuxeo-create-group #form');
  }

  get createGroupButton() {
    return this.el.element('nuxeo-create-group #createButton');
  }

  get editGroupButton() {
    return (async () => {
      const editEle = await this.el.element('#editGroupButton');
      return editEle;
    })();
  }

  get editGroupLabel() {
    return this.el.element('#editGroupDialog input');
  }

  get editGroupDialogButton() {
    return (async () => {
      const groupDialogEle = await this.el.element('#editGroupDialog paper-button.primary');
      return groupDialogEle;
    })();
  }

  get deleteGroupButton() {
    return (async () => {
      const deleteGroupEle = await this.el.element('#deleteGroupButton');
      return deleteGroupEle;
    })();
  }

  get confirmDeleteGroupButton() {
    return (async () => {
      const confirmButtonEle = await this.el.element('#deleteGroupDialog paper-button');
      return confirmButtonEle;
    })();
  }

  async fillMultipleValues(table) {
    table.rows().forEach(async (row) => {
      if (row[0] === 'groupName') {
        // eslint-disable-next-line prefer-destructuring
        global.groups[row[1]] = row[1];
      }
      const fieldEl = await this.getField(row[0]);
      await fieldEl.waitForVisible();
      const setEle = await fixtures.layouts.setValue(fieldEl, row[1]);
      return setEle;
    });
  }

  async searchFor(searchTerm) {
    await driver.waitForExist(this._selector);
    await driver.waitForVisible(this._selector);
    const searchBox = await this.el.element('nuxeo-user-group-search paper-input');
    await searchBox.waitForVisible();
    const setEle = await fixtures.layouts.setValue(searchBox, searchTerm);
    return setEle;
  }

  async searchResult(searchTerm) {
    const match = async (e) => (await e.getText()) === searchTerm;
    await driver.waitUntil(
      async () => {
        const tableEle = await this.el.elements('nuxeo-card[name="groups"] .table [name="id"]');
        await tableEle.some(match);
      },
      {
        timeoutMsg: 'searchResult timedout',
      },
    );
    const groupEle = await this.el.elements('nuxeo-card[name="groups"] .table [name="id"]');
    return groupEle.find(match);
  }
}
