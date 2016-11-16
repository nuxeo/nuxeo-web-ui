// temporary extensible doc type registry
window.nuxeo = window.nuxeo || {};
window.nuxeo.importBlacklist = window.nuxeo.importBlacklist || [
  'Workspace', 'Folder', 'OrderedFolder'
];
window.nuxeo.docTypes = window.nuxeo.docTypes || [
  {id: 'File', icon: 'icons:description'},
  {id: 'Note', icon: 'icons:subject'},
  {id: 'Picture', icon: 'image:image'},
  {id: 'Video', icon: 'av:video-library'},
  {id: 'Folder', icon: 'icons:folder'},
  {id: 'Workspace', icon: 'icons:folder-open'}
];
