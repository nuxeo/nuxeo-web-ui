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
import { fixture, html, flush, login } from '@nuxeo/testing-helpers';
import { _Suggester } from '../elements/nuxeo-suggester/nuxeo-suggester.js';
import '../elements/nuxeo-suggester/nuxeo-suggester.js';

suite('nuxeo-suggester', () => {
  let server;
  let element;

  setup(async () => {
    server = await login();
    element = await fixture(html`<nuxeo-suggester></nuxeo-suggester>`);
    sinon.stub(element, 'i18n').callsFake((key) => key);
  });

  teardown(() => {
    server.restore();
  });

  suite('initial state', () => {
    test('should default toggled to false', () => {
      expect(element.toggled).to.be.false;
    });

    test('should default searchTerm to empty string', () => {
      expect(element.searchTerm).to.equal('');
    });

    test('should default searchDelay to 500', () => {
      expect(element.searchDelay).to.equal(500);
    });
  });

  suite('_canShowResults', () => {
    test('should return false when searchTerm is empty', () => {
      element.searchTerm = '';
      element.items = [{ uid: '1' }];
      expect(element._canShowResults()).to.not.be.ok;
    });

    test('should return false when items is empty', () => {
      element.searchTerm = 'test';
      element.items = [];
      expect(element._canShowResults()).to.not.be.ok;
    });

    test('should return true when searchTerm and items exist', () => {
      element.searchTerm = 'test';
      element.items = [{ uid: '1' }];
      expect(element._canShowResults()).to.be.ok;
    });
  });

  suite('_getIcon', () => {
    test('should return icon for regular item', () => {
      const item = { type: 'File' };
      const icon = element._getIcon(item);
      expect(icon).to.equal('nuxeo:File');
    });

    test('should return falsy when item is a command (uses thumbnail instead)', () => {
      const item = { command: {}, icon: 'nuxeo:search' };
      const icon = element._getIcon(item);
      expect(icon).to.not.be.ok;
    });
  });

  suite('toggle', () => {
    test('should toggle toggled state', () => {
      element.toggled = false;
      element.toggle();
      expect(element.toggled).to.be.true;
    });

    test('should clear searchTerm when toggling', () => {
      element.searchTerm = 'test';
      element.toggle();
      expect(element.searchTerm).to.equal('');
    });
  });

  suite('_clearSearch', () => {
    test('should clear searchTerm', () => {
      element.searchTerm = 'test';
      element._clearSearch();
      expect(element.searchTerm).to.equal('');
    });
  });

  suite('_resultAnnouncement', () => {
    test('should return announcement string', () => {
      const result = element._resultAnnouncement('Doc 1', 0, 5);
      expect(result).to.equal('Doc 1 1 out of 5 results');
    });

    test('should return label when total is undefined', () => {
      expect(element._resultAnnouncement('Only', 0, undefined)).to.equal('Only');
    });
  });

  suite('ready', () => {
    test('should mirror document dir when host has no dir attribute', async () => {
      const prev = document.documentElement.getAttribute('dir');
      document.documentElement.setAttribute('dir', 'rtl');
      const el = await fixture(html`<nuxeo-suggester></nuxeo-suggester>`);
      expect(el.getAttribute('dir')).to.equal('rtl');
      if (prev == null) {
        document.documentElement.removeAttribute('dir');
      } else {
        document.documentElement.setAttribute('dir', prev);
      }
    });
  });

  suite('_getThumbnail', () => {
    test('should return icon when item has command and icon', () => {
      expect(element._getThumbnail({ command: {}, icon: 'img.png' })).to.equal('img.png');
    });

    test('should prefix nxcon url when thumbnailUrl is set', () => {
      element.$.nxcon.url = 'http://test';
      expect(element._getThumbnail({ thumbnailUrl: 'thumb/x' })).to.equal('http://test/thumb/x');
    });
  });

  suite('_getUrl', () => {
    test('should use urlFor for non-command items', () => {
      Object.defineProperty(element, 'urlFor', {
        configurable: true,
        writable: true,
        value: sinon.stub().returns('/#!/doc/File/id1'),
      });
      const url = element._getUrl({ type: 'File', id: 'id1' }, false);
      expect(url).to.equal('/#!/doc/File/id1');
    });

    test('should strip hashbang path segment when replaceHashbang is true', () => {
      Object.defineProperty(element, 'urlFor', {
        configurable: true,
        writable: true,
        value: sinon.stub().returns('/#!/browse/id'),
      });
      expect(element._getUrl({ type: 'File', id: 'x' }, true)).to.equal('/browse/id');
    });
  });

  suite('_handleInputKeydown', () => {
    test('should focus clear button on Tab when searchTerm is non-empty', () => {
      element.searchTerm = 'q';
      const ev = { key: 'Tab', shiftKey: false, preventDefault: sinon.spy() };
      sinon.stub(element.$.clearButton, 'focus');
      element._handleInputKeydown(ev);
      expect(ev.preventDefault).to.have.been.called;
      expect(element.$.clearButton.focus).to.have.been.called;
      element.$.clearButton.focus.restore();
    });
  });

  suite('_clearSearchKey', () => {
    test('should clear on Enter', () => {
      const ev = { key: 'Enter', preventDefault: sinon.spy() };
      element.searchTerm = 'x';
      element._clearSearchKey(ev);
      expect(ev.preventDefault).to.have.been.called;
      expect(element.searchTerm).to.equal('');
    });
  });

  suite('_resultFocused', () => {
    test('should set selector selected index from event model', () => {
      element._resultFocused({ model: { index: 2 } });
      expect(element.$.selector.selected).to.equal(2);
    });
  });

  suite('closeResults', () => {
    test('should prevent default and toggle closed', () => {
      element.toggled = true;
      const ev = { detail: { keyboardEvent: { preventDefault: sinon.spy() } } };
      sinon.stub(element, 'toggle');
      element.closeResults(ev);
      expect(ev.detail.keyboardEvent.preventDefault).to.have.been.called;
      expect(element.toggle).to.have.been.called;
      element.toggle.restore();
    });
  });

  suite('_itemClicked', () => {
    test('should run command when item defines command.run', () => {
      const run = sinon.spy();
      sinon.stub(element, 'toggle');
      element._itemClicked({
        model: { item: { command: { run } } },
      });
      expect(run).to.have.been.calledWith(element.searchTerm);
      expect(element.toggle).to.have.been.called;
      element.toggle.restore();
    });
  });

  suite('_Suggester.addCommand', () => {
    test('should ignore null command', () => {
      expect(() => _Suggester.addCommand(null)).to.not.throw();
    });

    test('should register a command with suggestion payload', () => {
      const cmd = {
        id: `test-cmd-${Date.now()}`,
        trigger: { searchTerm: 'hello', startsWith: false },
        suggestion: { id: 's1', icon: 'nuxeo:search', label: 'Hi' },
        run: sinon.spy(),
      };
      _Suggester.addCommand(cmd);
      expect(cmd.suggestion.command).to.equal(cmd);
    });
  });
});

suite('nuxeo-suggester — sanitization', () => {
  let suggester;

  setup(async () => {
    suggester = await fixture(html`<nuxeo-suggester></nuxeo-suggester>`);
    await flush();
  });

  test('sanitizes double quotes and trims search term', () => {
    const term = '  test "quoted"  ';
    expect(suggester._sanitizeSearchTerm(term)).to.equal('test %22quoted%22');
  });

  test('clears items and skips execution for blank search term', async () => {
    suggester.$.op.execute = sinon.stub().resolves();
    suggester.items = [{ id: '1', label: 'existing' }];
    suggester.searchTerm = '   ';
    await flush();

    expect(suggester.sanitizedSearchTerm).to.equal('');
    expect(suggester.items).to.deep.equal([]);
    expect(suggester.$.op.execute).to.not.have.been.called;
  });

  test('executes operation when sanitized search term is present', async () => {
    suggester.$.op.execute = sinon.stub().resolves();
    sinon.stub(suggester, 'debounce').callsFake((jobName, callback) => callback());
    suggester.searchTerm = 'invoice "2024"';
    await flush();

    expect(suggester.sanitizedSearchTerm).to.equal('invoice %222024%22');
    expect(suggester.$.op.execute).to.have.been.calledOnce;
  });
});
