const path = require('path');
const fs = require('fs');
const { expect } = require('chai');
const { layoutPolymer3 } = require('../layout-engine');

describe('layout-engine', () => {
  describe('polymer 3', () => {
    it('generates field layouts', async () => {
      const jsonContent = fs.readFileSync(path.join(__dirname, 'fixtures/layouts/field-layout.json'), 'utf8');
      const model = JSON.parse(jsonContent);
      expect(model.element).to.be.equal('field-layout');
      expect(model.elements).to.have.lengthOf(2);
      const layout = layoutPolymer3(model);
      const js = fs.readFileSync(path.join(__dirname, 'fixtures/layouts/field-layout.js'), 'utf8');
      expect(layout).to.be.equal(js);
    });
    it('check generated layout', async () => {
      const jsonContent = fs.readFileSync(path.join(__dirname, 'fixtures/layouts/dummy-layout.json'), 'utf8');
      const model = JSON.parse(jsonContent);
      expect(model.element).to.be.equal('dummy-layout');
      expect(model.elements).to.have.lengthOf(2);
      const layout = layoutPolymer3(model);
      const js = fs.readFileSync(path.join(__dirname, 'fixtures/layouts/dummy-layout.js'), 'utf8');
      expect(layout).to.be.equal(js);
    });
  });
});
