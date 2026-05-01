/**
 * Set webpack public path dynamically so @open-wc/webpack-import-meta-loader 0.4.x
 * constructs correct import.meta.url values for the deployment prefix (e.g. /nuxeo/ui/).
 * This file MUST be the first entry in the webpack entry array.
 */
// eslint-disable-next-line camelcase, no-undef
__webpack_public_path__ = window.location.pathname.replace(/\/$/, '') + '/';
