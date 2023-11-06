import BasePage from '../base';
import Clipboard from './clipboard';
import Collections from './collections';
import Favorites from './favorites';
import Recents from './recents';
import Tasks from './tasks';

export default class Drawer extends BasePage {
  get menu() {
    return (async () => {
      const menuTemp = await this.el.$('#menu');
      return menuTemp;
    })();
  }

  get pages() {
    return this.el.$('iron-pages');
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

  async open(name) {
    //  await this.menu.waitForVisible();
    const section = await this._section(name);
    if (!(await section.isVisible())) {
      const menu = await this.menu;
      await menu.$(`nuxeo-menu-icon[name='${name}']`).click();
    }
    await section.waitForVisible();
    return section;
  }

  _section(name) {
    return (async () => {
      const section = await this.pages.$(`[name='${name}']`);
      return section;
    })();
  }

  _search(name) {
    return this.pages.$(`[search-name='${name}']`);
  }
}
