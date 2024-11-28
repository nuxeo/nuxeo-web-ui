import BasePage from '../base';
import Clipboard from './clipboard';
import Collections from './collections';
import Favorites from './favorites';
import Recents from './recents';
import Tasks from './tasks';

export default class Drawer extends BasePage {
  get menu() {
    return (async () => {
      const menuEl = await this.el.$('#menu');
      return menuEl;
    })();
  }

  get pages() {
    return (async () => this.el.$('iron-pages'))();
  }

  get logo() {
    return this.el.$('#logo');
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
    return (async () => {
      const section = await this._section('administration');
      return section;
    })();
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
    return (async () => {
      const personal = await this._section('personalWorkspace');
      return personal;
    })();
  }

  get profile() {
    return this._section('profile');
  }

  async open(name) {
    const menu = await this.menu;
    let isDrawerVisible = await this.isDrawerOpened(menu);
    if (!isDrawerVisible) {
      const buttonToclick = await menu.$(`nuxeo-menu-icon[name='${name}']`);
      await buttonToclick.click();
      isDrawerVisible = await this.isDrawerOpened(menu);
    }
    return isDrawerVisible;
  }

  async isDrawerOpened(menu) {
    return (await menu.$(`paper-listbox[id='menu']`).getAttribute('aria-expanded')) === 'true';
  }

  async _section(name) {
    const page = await this.pages;
    const section = await page.$(`[name='${name}']`);
    return section;
  }

  _search(name) {
    return this.pages.$(`[search-name='${name}']`);
  }
}
