'use strict';

export default class DocumentEdit {
  constructor(el) {
    this.el = el;
  }

  isVisible() {
    return this.el.isVisible();
  }

  set title(title) {
    // XXX this.form.setValue('input[name="title"]', title)
    this.el.setValue('input[required]', title);
  }

  submit() {
    this.el.click('///paper-button[text()="Save"]');
  }
}
