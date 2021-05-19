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
    if (this.$.bulkOpBtn) {
      this.$.bulkOpBtn.addEventListener('response', this._onResponse.bind(this));
      this.$.bulkOpBtn.addEventListener('poll-start', this._onPollStart.bind(this));
    }
  },

  _isSelectAllActive() {
    return this.view && this.view.selectAllActive;
  },

  _params() {
    // todo
  },

  _onPollStart() {
    // todo
  },

  _onResponse() {
    // todo
  },
};
