import { PageProviderDisplayBehavior } from '@nuxeo/nuxeo-ui-elements/nuxeo-page-provider-display-behavior.js';

export const isPageProviderDisplayBehavior = (el) =>
  el && el.behaviors && el.selectAllActive && PageProviderDisplayBehavior.every((p) => el.behaviors.includes(p));
