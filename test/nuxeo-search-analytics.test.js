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
import '../elements/nuxeo-admin/nuxeo-search-analytics.js';

suite('nuxeo-search-analytics', () => {
  let el;

  setup(async () => {
    el = await fixture(html`<nuxeo-search-analytics></nuxeo-search-analytics>`);
    sinon.stub(el, 'i18n').callsFake((k) => k);
    await flush();
  });

  suite('_range', () => {
    test('returns inclusive integer range', () => {
      expect(el._range(2, 5)).to.deep.equal([2, 3, 4, 5]);
    });

    test('returns single element when start equals end', () => {
      expect(el._range(4, 4)).to.deep.equal([4]);
    });
  });

  suite('_aggregatePerHourOfDay', () => {
    test('sums values per hour bucket and pads missing hours with zero', () => {
      const entries = [
        { key: 9, value: 2 },
        { key: 9, value: 3 },
        { key: 14, value: 1 },
      ];
      const [series] = el._aggregatePerHourOfDay(entries);
      expect(series[9]).to.equal(5);
      expect(series[14]).to.equal(1);
      expect(series[0]).to.equal(0);
      expect(series[23]).to.equal(0);
    });
  });

  test('pie chart resizes to fill the available card space', async () => {
    el.setProperties({
      callsPerProvider: [],
      callsPerHour: [],
      callPerNumberOfResults: [],
      callsPerFT: [],
      callPerNumberOfPages: [],
      callByFilters: [],
      visible: true,
    });
    await flush();

    const card = el.root.querySelector('nuxeo-card.pie-card');
    expect(window.getComputedStyle(card).display).to.equal('flex');
    expect(window.getComputedStyle(card).flexDirection).to.equal('column');

    const chart = card.querySelector('chart-pie');
    expect(window.getComputedStyle(chart).minWidth).to.equal('0px');
    expect(window.getComputedStyle(chart).flexGrow).to.equal('1');
    expect(chart.options.maintainAspectRatio).to.be.false;
  });
});
