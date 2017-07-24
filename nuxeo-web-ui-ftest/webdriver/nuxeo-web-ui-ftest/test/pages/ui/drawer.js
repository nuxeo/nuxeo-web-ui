'use strict';

import BasePage from '../base';
import Collections from './collections';
import Favorites from './favorites';

export default class Drawer extends BasePage {

  get menu() {
    return this.el.element('#menu');
  }

  get pages() {
    return this.el.element('iron-pages');
  }

  get logo() {
    return this.el.element('#logo');
  }

  get browser() {
    return this._section('browser');
  }

  get search() {
    return this._section('search');
  }

  get administration() {
    return this._section('administration');
  }

  get recents() {
    return this._section('recents');
  }

  get tasks() {
    return this._section('tasks');
  }

  get tasksLink() {
    return this.pages.element(`a.tasks-dashboard`);
  }

  get favorites() {
    return new Favorites('nuxeo-favorites');
  }

  get collections() {
    return new Collections(`nuxeo-collections`);
  }

  get personal() {
    return this._section('personalWorkspace');
  }

  get profile() {
    return this._section('profile');
  }

  open(name) {
    this.menu.click(`nuxeo-menu-icon[name='${name}']`);
    const section = this._section(name);
    section.waitForVisible();
    return section;
  }

  _section(name) {
    return this.pages.element(`[name='${name}']`);
  }

  _search(name) {
    return this.pages.element(`[search-name='${name}']`);
  }
}
