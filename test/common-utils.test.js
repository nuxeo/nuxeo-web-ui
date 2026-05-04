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
import { handleVerticalKeyNavigation } from '../elements/common-utils.js';

suite('common-utils', () => {
  suite('handleVerticalKeyNavigation', () => {
    let rootNode;
    let items;

    function createEvent(key, currentTarget) {
      return {
        key,
        preventDefault: sinon.spy(),
        stopPropagation: sinon.spy(),
        target: { getRootNode: () => rootNode },
        currentTarget: currentTarget || items[0],
      };
    }

    setup(() => {
      items = [
        { focus: sinon.spy(), scrollIntoView: sinon.spy() },
        { focus: sinon.spy(), scrollIntoView: sinon.spy() },
        { focus: sinon.spy(), scrollIntoView: sinon.spy() },
      ];
      rootNode = {
        querySelectorAll: sinon.stub(),
      };
      rootNode.querySelectorAll.withArgs('.item').returns(items);
      rootNode.querySelectorAll.withArgs('nuxeo-data-list').returns([]);
    });

    test('should ignore keys other than ArrowDown and ArrowUp', () => {
      const e = createEvent('Enter');
      handleVerticalKeyNavigation(e, '.item');
      expect(e.preventDefault).to.not.have.been.called;
    });

    test('should focus next item on ArrowDown', () => {
      const e = createEvent('ArrowDown', items[0]);
      handleVerticalKeyNavigation(e, '.item');
      expect(e.preventDefault).to.have.been.called;
      expect(items[1].focus).to.have.been.called;
    });

    test('should focus previous item on ArrowUp', () => {
      const e = createEvent('ArrowUp', items[1]);
      handleVerticalKeyNavigation(e, '.item');
      expect(e.preventDefault).to.have.been.called;
      expect(items[0].focus).to.have.been.called;
    });

    test('should not navigate above the first item on ArrowUp', () => {
      const e = createEvent('ArrowUp', items[0]);
      handleVerticalKeyNavigation(e, '.item');
      expect(e.preventDefault).to.have.been.called;
      // nextIndex would be -1, so no item should be focused
      expect(items[0].focus).to.not.have.been.called;
      expect(items[1].focus).to.not.have.been.called;
      expect(items[2].focus).to.not.have.been.called;
    });

    test('should attempt scroll when ArrowDown goes beyond rendered items', () => {
      const scrollToIndex = sinon.spy();
      rootNode.querySelectorAll.withArgs('nuxeo-data-list').returns([{ scrollToIndex }]);
      const e = createEvent('ArrowDown', items[2]);
      handleVerticalKeyNavigation(e, '.item');
      expect(scrollToIndex).to.have.been.calledWith(3);
    });
  });
});
