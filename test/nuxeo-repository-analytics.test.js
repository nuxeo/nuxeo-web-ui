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

  suite('_cardAria', () => {
    test('returns the heading when the value is not available', () => {
      expect(el._cardAria('repositoryAnalytics.topDownloads.heading')).to.equal(
        'repositoryAnalytics.topDownloads.heading',
      );
    });

    test('includes the value for the document count card', () => {
      expect(el._cardAria('repositoryAnalytics.documents.heading', 42)).to.equal(
        'repositoryAnalytics.documents.heading: 42',
      );
    });
  });

  test('_types maps known mime keys through mime table', () => {
    const labels = el._types([{ key: 'text/plain' }, { key: 'unknown/xyz' }]);
    expect(labels[0]).to.be.a('string');
    expect(labels[1]).to.equal('unknown/xyz');
  });

  suite('_mimeName', () => {
    test('returns the friendly name when the mime type defines one', () => {
      expect(el._mimeName('application/pdf')).to.equal('PDF');
    });

    test('falls back to the uppercased first extension when there is no name', () => {
      expect(el._mimeName('application/andrew-inset')).to.equal('EZ');
    });

    test('returns the raw key for unknown mime types', () => {
      expect(el._mimeName('unknown/xyz')).to.equal('unknown/xyz');
    });
  });

  suite('_chartAria', () => {
    test('returns only the heading when data is undefined', () => {
      expect(el._chartAria('repositoryAnalytics.documentTypes.heading', undefined, '', false)).to.equal(
        'repositoryAnalytics.documentTypes.heading',
      );
    });

    test('returns only the heading when data is empty', () => {
      expect(el._chartAria('repositoryAnalytics.documentTypes.heading', [], '', false)).to.equal(
        'repositoryAnalytics.documentTypes.heading',
      );
    });

    test('composes heading with label/value pairs for non-empty data', () => {
      const data = [
        { key: 'nco-admin', value: 7 },
        { key: 'system', value: 4 },
      ];
      expect(el._chartAria('repositoryAnalytics.topNCreators.heading', data, '10', false)).to.equal(
        'repositoryAnalytics.topNCreators.heading. nco-admin: 7, system: 4',
      );
    });

    test('uses mime-friendly names when useMimeNames is true', () => {
      const data = [
        { key: 'application/pdf', value: 5 },
        { key: 'unknown/xyz', value: 2 },
      ];
      expect(el._chartAria('repositoryAnalytics.filesByMimeType.heading', data, '', true)).to.equal(
        'repositoryAnalytics.filesByMimeType.heading. PDF: 5, unknown/xyz: 2',
      );
    });

    test('passes the heading argument through to i18n', () => {
      el._chartAria('repositoryAnalytics.topNCreators.heading', [], '10', false);
      expect(el.i18n).to.have.been.calledWith('repositoryAnalytics.topNCreators.heading', '10');
    });
  });
});
