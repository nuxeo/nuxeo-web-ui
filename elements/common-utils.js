/**
@license
©2023 Hyland Software, Inc. and its affiliates. All rights reserved. 
All Hyland product names are registered or unregistered trademarks of Hyland Software, Inc. or its affiliates.
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

export function handleVerticalKeyNavigation(e, itemSelector) {
  const { key } = e;
  if (key !== 'ArrowDown' && key !== 'ArrowUp') {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  const rootNode = e.target.getRootNode();
  const items = rootNode.querySelectorAll(itemSelector);
  const currentIndex = Array.from(items).indexOf(e.currentTarget);
  const nextIndex = key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;

  if (nextIndex >= 0 && nextIndex < items.length) {
    items[nextIndex].focus();
  }
}
