'use strict';

import Collections from './collections';
import Favorites from './favorites';

export default class Drawer {

  constructor(selector) {
    this._drawer = driver.element(selector);
    this.pages = this._drawer.element('iron-pages');
    this.logo =  this._drawer.element('#logo');
  }

  get menu() {
    return this._drawer.element('#menu');
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

  openSearch(name) {
    this.menu.click(`nuxeo-menu-icon[name='${name}Search']`);
    this._section('search').waitForVisible(2000);
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
}
