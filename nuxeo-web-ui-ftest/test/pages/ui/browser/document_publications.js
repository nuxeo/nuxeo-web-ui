import BasePage from '../../base';

export default class DocumentPermissions extends BasePage {
  get count() {
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row:not([header])');
    return rows.value.filter(result => result.getAttribute('hidden') === null).length;
  }

  hasPublication(path, rendition, version) {
    this.waitForVisible('nuxeo-data-table nuxeo-data-table-row:not([header])');
    const rows = this.el.elements('nuxeo-data-table nuxeo-data-table-row:not([header])');
    const found = rows.value.some((row) => {
      if (row.isVisible('nuxeo-data-table-cell a.path')) {
        const foundPath = row.getText('nuxeo-data-table-cell a.path').toLowerCase();
        const foundRendition = row.getText('nuxeo-data-table-cell .rendition').trim().toLowerCase();
        const foundVersion = row.getText('nuxeo-data-table-cell .version').trim().toLowerCase();
        if (foundPath.indexOf(path.trim().toLowerCase()) !== 0) {
          return false;
        }
        if (foundRendition !== rendition.toLowerCase()) {
          return false;
        }
        if ((foundVersion || version) && foundVersion !== version.toLowerCase()) {
          return false;
        }
        return true;
      }
      return false;
    });
    return found;
  }

  waitForVisible() {
    return this.el.waitForVisible();
  }
}
