/**
 * `Nuxeo.I18nBehavior` provides a `i18n` helper function for translations.
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
    /**
     * The interval to poll for the result, in milliseconds.
     */
    pollInterval: {
      type: Number,
      value: 1000,
    },
  },

  ready() {
    const {bulkOpBtn} = this;
    if (bulkOpBtn) {
      bulkOpBtn.addEventListener('response', this._onResponse.bind(this));
      bulkOpBtn.addEventListener('poll-start', this._onPollStart.bind(this));
      bulkOpBtn.addEventListener('poll-update', this._onPollUpdate.bind(this));
    }
  },

  get bulkOpBtn() {
    return this.$.bulkOpBtn;
  },

  _isSelectAllActive() {
    return this.view && this.view.selectAllActive;
  },

  _onPollStart() {
    // todo
  },

  _onPollUpdate() {
    // todo
  },

  _onResponse() {
    // todo
  },
};
