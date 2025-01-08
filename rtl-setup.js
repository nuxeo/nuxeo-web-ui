window.nuxeo = window.nuxeo || {};
window.nuxeo.I18n = window.nuxeo.I18n || {};
const userLanguage = navigator.language || navigator.userLanguage || 'en';
if (userLanguage) {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  const isRTL = rtlLanguages.some((lang) => userLanguage?.startsWith(lang));
  window.nuxeo.I18n.direction = isRTL ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', window.nuxeo.I18n.direction || 'ltr');
  const nuxeoApp = document.querySelector('nuxeo-app');
  if (nuxeoApp) {
    nuxeoApp.setAttribute('dir', window.nuxeo.I18n.direction || 'ltr');
  }
}
