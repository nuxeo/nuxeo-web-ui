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
import { fixture, flush, html } from '@nuxeo/testing-helpers';
import '../elements/nuxeo-admin/nuxeo-repository-analytics.js';

suite('nuxeo-repository-analytics', () => {
  let el;

  setup(async () => {
    el = await fixture(html`<nuxeo-repository-analytics></nuxeo-repository-analytics>`);
    sinon.stub(el, 'i18n').callsFake((k) => k);
    await flush();
  });

  test('_isEmpty is true for missing or empty arrays', () => {
    expect(el._isEmpty()).to.be.true;
    expect(el._isEmpty([])).to.be.true;
    expect(el._isEmpty([1])).to.be.false;
  });

  test('_downloadsQuery builds IN clause for uuids', () => {
    const q = el._downloadsQuery([{ key: 'uuid-a' }, { key: 'uuid-b' }]);
    expect(q).to.include('uuid-a');
    expect(q).to.include('uuid-b');
    expect(q).to.include('ecm:uuid IN');
  });

  test('_downloadsQuery is undefined when there are no entries', () => {
    expect(el._downloadsQuery([])).to.equal(undefined);
  });

  test('_numberOfDownloads reads value from downloads aggregate', () => {
    el.downloads = [
      { key: 'd1', value: 3 },
      { key: 'd2', value: 7 },
    ];
    expect(el._numberOfDownloads({ uid: 'd2' })).to.equal(7);
  });

  test('_types maps known mime keys through mime table', () => {
    const labels = el._types([{ key: 'text/plain' }, { key: 'unknown/xyz' }]);
    expect(labels[0]).to.be.a('string');
    expect(labels[1]).to.equal('unknown/xyz');
  });

  test('charts can shrink to fit their cards', async () => {
    el.setProperties({
      downloads: [],
      downloadedDocs: [],
      totalCount: 0,
      typeCount: [],
      topCreators: [],
      docsCreatedPerWeek: [],
      docsModifiedPerWeek: [],
      filesByMimeType: [],
      visible: true,
    });
    await flush();

    const charts = el.root.querySelectorAll('chart-line, chart-pie');
    expect(charts).to.have.lengthOf(5);
    charts.forEach((chart) => {
      expect(window.getComputedStyle(chart).minWidth).to.equal('0px');
    });
  });
});
