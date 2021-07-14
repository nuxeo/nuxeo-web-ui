/**
 * `Nuxeo.SelectAllBehavior` provides a set of select all helper methods.
 *
 * @polymerBehavior
 */
export const SelectAllBehavior = {
  properties: {
    /**
     * An instance of a view (table, grid, list) that implements the `nuxeo-page-provider-display-behavior` and
     * supports select all mode.
     */
    view: {
      type: Object,
    },
  },

  get bulkOpBtn() {
    return this.$$('#bulkOpBtn');
  },

  _isSelectAllActive() {
    return this.view && this.view.selectAllActive;
  },
};
