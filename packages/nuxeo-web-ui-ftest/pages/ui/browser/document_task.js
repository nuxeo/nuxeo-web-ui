import BasePage from '../../base';

export default class DocumentTask extends BasePage {
  get delegateOption() {
    return this.el.element('.options #delegateBtn');
  }

  get reassignOption() {
    return this.el.element('.options #reassignBtn');
  }

  get assignmentDialog() {
    return this.el.element('#assignmentDialog');
  }

  get confirmButton() {
    return this.el.element('#assignmentDialog .buttons #confirm');
  }

  get cancelButton() {
    return this.el.element('#assignmentDialog .buttons #cancel');
  }

  get assignedActors() {
    return this.el.element('#assignedActors nuxeo-tags');
  }

  get delegatedActors() {
    return this.el.element('#delegatedActors nuxeo-tags');
  }

  get taskLayout() {
    return this.el.element('#layout');
  }

  async setUserOrGroup(userOrGroup) {
    const fieldEl = await this.el.element('[name="userGroup"]');
    await fixtures.layouts.setValue(fieldEl, userOrGroup);
  }

  async actorExists(element, actor) {
    const users = await element.$$('nuxeo-user-tag .tag a');
    const result = await users.some(async (user) => (await user.getText()) === `${actor}`);
    return result;
  }

  async performAction(name) {
    const layout = await this.taskLayout;
    await layout.waitForVisible();
    const ele = await this.el.element(`.options paper-button[name="${name}"]`);
    await ele.waitForVisible();
    await ele.click();
  }
}
