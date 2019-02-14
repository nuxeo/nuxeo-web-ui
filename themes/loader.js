/**
@license
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var url = 'themes/' + (localStorage.getItem('theme') || 'default') + '/theme.html';
var xhr = new XMLHttpRequest();
xhr.open('HEAD', url, false);
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4) {
    if (xhr.status === 404) {
      console.warn('"' + localStorage.getItem('theme') + '" theme not found, fallback to "default".');
      localStorage.setItem('theme', 'default');
    }
    var link = document.createElement('link');
    link.setAttribute('rel', 'import');
    link.setAttribute('href', 'themes/' + (localStorage.getItem('theme') || 'default') + '/theme.html');
    document.head.appendChild(link);
  }
};
xhr.send(null);
