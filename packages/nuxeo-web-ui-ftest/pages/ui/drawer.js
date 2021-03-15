import BasePage from '../base';
import Clipboard from './clipboard';
import Collections from './collections';
import Favorites from './favorites';
import Recents from './recents';
import Tasks from './tasks';

export default class Drawer extends BasePage {
  get menu() {
    return this.el.$('#menu');
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

  get clipboard() {
    return new Clipboard('nuxeo-clipboard');
  }

  get search() {
    return this._section('search');
  }

  get administration() {
    return this._section('administration');
  }

  get recents() {
    return new Recents('nuxeo-recent-documents');
  }

  get tasks() {
    return new Tasks('nuxeo-tasks-drawer');
  }

  get favorites() {
    return new Favorites('nuxeo-favorites');
  }

  get collections() {
    return new Collections('nuxeo-collections');
  }

  get personal() {
    return this._section('personalWorkspace');
  }

  get profile() {
    return this._section('profile');
  }

  open(name) {
    this.menu.waitForVisible();
    const section = this._section(name);
    if (!section.isVisible()) {
      this.menu.element(`nuxeo-menu-icon[name='${name}']`).click();
    }
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
