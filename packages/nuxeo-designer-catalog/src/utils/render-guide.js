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
const marked = require('marked');

const renderer = new marked.Renderer();
let firstHeading = true;
let permalinks = [];

renderer.heading = (text, level) => {
  let permalink = text.toLowerCase().replace(/[^\w]+/g, '-');
  if (permalinks.indexOf(permalink) >= 0) {
    permalink += '-1';
  }
  permalinks.push(permalink);

  const htext = `<h${level} id="${permalink}">${text}</h${level}>`;

  if (level === 2) {
    let out = '';
    if (firstHeading) {
      firstHeading = false;
    } else {
      out += '</section>\n\n';
    }
    return `${out}<section class="guide-section">\n${htext}\n`;
  }
  return htext;
};

module.exports = (content) => {
  permalinks = [];
  firstHeading = true;

  let out = marked(content, { renderer });
  out += '</section>';
  return out;
};
