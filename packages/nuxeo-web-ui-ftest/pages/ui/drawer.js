import BasePage from '../base.js';
import Clipboard from './clipboard.js';
import Collections from './collections.js';
import Favorites from './favorites.js';
import Recents from './recents.js';
import Tasks from './tasks.js';

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

  // Home navigation is the dedicated home shortcut, not the (now decorative) logo.
  get home() {
    return this.el.$('nuxeo-menu-icon[name="home"]');
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
    const currentMenu = await this.menu;
    await currentMenu.waitForVisible();
    const section = await this._section(name);
    const isVisible = await section.isVisible();
    if (!isVisible) {
      const menu = await this.menu;
      const buttonToclick = await menu.$(`nuxeo-menu-icon[name='${name}']`);
      await buttonToclick.click();
      // Wait for the opened panel to be visible after the click
      await driver.waitUntil(
        async () => {
          try {
            return await section.isDisplayed();
          } catch (e) {
            return false;
          }
        },
        { timeout: 10000, interval: 500, timeoutMsg: `Drawer section "${name}" did not become visible after click` },
      );
    }
    return section;
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
