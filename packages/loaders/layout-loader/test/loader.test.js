const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const compile = require('./helpers/compiler');

describe('loader', () => {
  it('should work', async () => {
    const stats = await compile('fixtures/layouts/dummy-layout');
    const { modules } = stats.toJson();
    // assert that the json file was loaded as a module
    expect(modules).to.have.length.greaterThan(0);
    const module = modules[modules.length - 1];
    expect(path.join(__dirname, module.name)).to.equal(path.join(__dirname, 'fixtures/layouts/dummy-layout.json'));

    // assert that the generate layout is the expected
    const js = fs.readFileSync(path.join(__dirname, 'fixtures/layouts/test.js'), 'utf8');
    expect(module.source).to.be.equal(js);
  });
});
