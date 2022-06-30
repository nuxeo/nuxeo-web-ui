import BasePage from '../base';

export default class ParentInspector extends BasePage {    
      get dialog() {
        return this.el.element('#dialog');
      }
    
      get title() {
        return this.el.element('.table tbody tr:nth-child(1) td:nth-child(1)');
      }
    
      get path() {
        return this.el.element('.table tbody tr:nth-child(2) td:nth-child(1)');
      }
    
      get uid() {
        return this.el.element('.table tbody tr:nth-child(3) td:nth-child(1)');
      }
    
      get facets() {
        return this.el.element('.facetscontainer h1');
      }
    
      get schema() {
        return this.el.element('.schemascontainer h1');
      }
}
