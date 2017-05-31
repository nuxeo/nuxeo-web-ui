/*
 * @license
 * (C) Copyright Nuxeo Corp. (http://nuxeo.com/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var emptyCollectionsResponse = {
  "entity-type": "documents",
  "entries": []
};

var collectionsResponse = {
  "entity-type": "documents",
  "entries": [{
    "entity-type":"document",
     "uid":"1",
     "type":"Collection",
     "title":"My Collection"
   }]
};

var docsResponse = {
  "entity-type": "documents",
  "entries": [{
    "contextParameters":{"thumbnail":{"url":null}},
    "entity-type":"document",
     "uid":"2",
     "type":"Picture",
     "title":"My picture in Collection"
   }, {
    "contextParameters":{"thumbnail":{"url":null}},
    "entity-type":"document",
     "uid":"3",
     "type":"Video",
     "title":"My video in Collection"
   }]
};
