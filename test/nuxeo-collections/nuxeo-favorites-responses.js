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
var emptyFavoritesResponse = {
  "entity-type": "documents",
  "resultsCount": 0,
  "entries": []
};

var favoritesResponse = {
  "entity-type": "documents",
  "resultsCount": 2,
  "entries": [{
    "entity-type":"document",
     "uid":"2",
     "type":"Picture",
     "title":"My picture in Favorites",
     "properties": {
      "common:icon": "/icons/file.gif"
    },
    "contextParameters": {
        "thumbnail": {
            "url": "/icons/file.gif"
        }
    }
   }, {
    "entity-type":"document",
     "uid":"3",
     "type":"Video",
     "title":"My video in Favorites",
     "properties": {
      "common:icon": "/icons/file.gif"
    },
    "contextParameters": {
        "thumbnail": {
            "url": "/icons/file.gif"
        }
    }
   }]
};
