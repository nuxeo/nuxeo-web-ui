// temporary extensible doc type registry
window.nuxeo = window.nuxeo || {};
window.nuxeo.importBlacklist = window.nuxeo.importBlacklist || [
  'Workspace', 'Folder', 'OrderedFolder'
];
window.nuxeo.docTypes = window.nuxeo.docTypes || [
  {id: 'File', icon: '/images/doctypes/document_file.svg'},
  {id: 'Note', icon: '/images/doctypes/document_note.svg'},
  {id: 'Picture', icon: '/images/doctypes/document_picture.svg'},
  {id: 'Video', icon: '/images/doctypes/document_video.svg'},
  {id: 'Audio', icon: '/images/doctypes/document_audio.svg'},
  {id: 'Folder', icon: '/images/doctypes/container.svg'},
  {id: 'Workspace', icon: '/images/doctypes/container.svg'}
];
