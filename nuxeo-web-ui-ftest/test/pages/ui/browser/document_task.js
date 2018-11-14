

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

  setUserOrGroup(userOrGroup) {
    const fieldEl = this.el.element('[name="userGroup"]');
    fixtures.layouts.setValue(fieldEl, userOrGroup);
  }

  actorExists(element, actor) {
    const users = element.elements('nuxeo-user-tag .tag a').value;
    return users.some(user => user.getText() === `${actor} undefined`);
  }

  performAction(name) {
    this.el.waitForVisible(`.options paper-button[name="${name}"]`);
    this.el.element(`.options paper-button[name="${name}"]`).click();
  }
}
