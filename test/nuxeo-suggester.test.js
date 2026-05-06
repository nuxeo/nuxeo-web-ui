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
import { fixture, html, flush } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-suggester/nuxeo-suggester.js';

suite('nuxeo-suggester', () => {
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
