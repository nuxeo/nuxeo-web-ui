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
suite('fetch-schemas', () => {
  /** Fresh module instance so module-level cache does not leak across tests or the rest of Karma. */
  const load = async () => {
    const { _fetchSchemas } = await import(`../elements/fetch-schemas.js?test=${Date.now()}`);
    return _fetchSchemas;
  };

  test('sets path to config/schemas and populates cache on first call', async () => {
    const _fetchSchemas = await load();
    const payload = { foo: 'bar' };
    const resource = { path: 'ignored', get: sinon.stub().resolves(payload) };
    const result = await _fetchSchemas(resource);
    expect(resource.path).to.equal('config/schemas');
    expect(resource.get).to.have.been.calledOnce;
    expect(result).to.equal(payload);
  });

  test('returns cached schemas without calling get on subsequent calls', async () => {
    const _fetchSchemas = await load();
    const payload = { foo: 'bar' };
    const first = { path: 'a', get: sinon.stub().resolves(payload) };
    await _fetchSchemas(first);
    const second = { path: 'should-not-change', get: sinon.stub().resolves({ other: true }) };
    const cached = await _fetchSchemas(second);
    expect(second.get).to.not.have.been.called;
    expect(second.path).to.equal('should-not-change');
    expect(cached).to.deep.equal(payload);
  });
});
