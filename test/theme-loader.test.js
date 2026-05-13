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
import { UNSAFE_THEME_PATTERN, safeSetTheme, getValidTheme } from '../themes/loader.js';

suite('theme-loader', () => {
  let getItemStub;
  let setItemStub;
  let warnStub;

  setup(() => {
    getItemStub = sinon.stub(localStorage, 'getItem');
    setItemStub = sinon.stub(localStorage, 'setItem');
    warnStub = sinon.stub(console, 'warn');
  });

  teardown(() => {
    sinon.restore();
  });

  suite('UNSAFE_THEME_PATTERN', () => {
    test('should reject unsafe characters and path traversal', () => {
      ['foo/bar', 'foo\\bar', '../etc', 'http:', '%2f', 'default?x=1', 'default#foo'].forEach((value) => {
        expect(UNSAFE_THEME_PATTERN.test(value), `expected "${value}" to be rejected`).to.be.true;
      });
    });

    test('should allow valid theme names', () => {
      ['default', 'dark', 'light', 'kawaii', 'my-custom-theme'].forEach((value) => {
        expect(UNSAFE_THEME_PATTERN.test(value), `expected "${value}" to be allowed`).to.be.false;
      });
    });
  });

  suite('safeSetTheme', () => {
    test('should not throw and should warn when localStorage is unavailable', () => {
      setItemStub.throws(new Error('SecurityError'));
      expect(() => safeSetTheme('dark')).to.not.throw();
      expect(warnStub).to.have.been.calledOnce;
    });
  });

  suite('getValidTheme', () => {
    test('should return stored theme when valid', () => {
      getItemStub.returns('dark');
      expect(getValidTheme()).to.equal('dark');
    });

    test('should return "default" and not write when key is absent', () => {
      getItemStub.returns(null);
      expect(getValidTheme()).to.equal('default');
      expect(setItemStub).to.not.have.been.called;
    });

    test('should return "default" and correct storage for unsafe values', () => {
      getItemStub.returns('../malicious');
      expect(getValidTheme()).to.equal('default');
      expect(setItemStub).to.have.been.calledWith('theme', 'default');
    });

    test('should trim whitespace and persist normalized value', () => {
      getItemStub.returns('  dark  ');
      expect(getValidTheme()).to.equal('dark');
      expect(setItemStub).to.have.been.calledWith('theme', 'dark');
    });

    test('should return "default" when localStorage.getItem throws', () => {
      getItemStub.throws(new Error('SecurityError'));
      expect(getValidTheme()).to.equal('default');
    });
  });
});
