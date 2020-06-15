/* eslint-disable no-else-return, no-prototype-builtins */

/**
 * Returns single value from the data array
 * @param {Number} row
 * @param {Number} prop
 */
Handsontable.DataMap.prototype.get = function(row, prop) {
  row = Handsontable.hooks.execute(this.instance, 'modifyRow', row);
  if (typeof prop === 'string' && prop.indexOf('.') > -1) {
    const sliced = prop.split('.');
    let out = this.dataSource[row];
    if (!out) {
      return null;
    }
    for (let i = 0, ilen = sliced.length; i < ilen; i++) {
      out = out[sliced[i]];
      // NXP-28923 -  if (typeof out === 'undefined') {
      if (out == null) {
        return null;
      }
    }
    return out;
  } else if (typeof prop === 'function') {
    /**
     *  allows for interacting with complex structures, for example
     *  d3/jQuery getter/setter properties:
     *
     *    {columns: [{
     *      data: function(row, value){
     *        if(arguments.length === 1){
     *          return row.property();
     *        }
     *        row.property(value);
     *      }
     *    }]}
     */
    return prop(this.dataSource.slice(row, row + 1)[0]);
  } else {
    return this.dataSource[row] ? this.dataSource[row][prop] : null;
  }
};

/**
 * Saves single value to the data array
 * @param {Number} row
 * @param {Number} prop
 * @param {String} value
 * @param {String} [source] Optional. Source of hook runner.
 */
Handsontable.DataMap.prototype.set = function(row, prop, value, source) {
  row = Handsontable.hooks.execute(this.instance, 'modifyRow', row, source || 'datamapGet');
  if (typeof prop === 'string' && prop.indexOf('.') > -1) {
    const sliced = prop.split('.');
    let out = this.dataSource[row];
    let i;
    let ilen;
    for (i = 0, ilen = sliced.length - 1; i < ilen; i++) {
      // NXP-28923 - if (typeof out[sliced[i]] === 'undefined'){
      if (out[sliced[i]] == null) {
        out[sliced[i]] = {};
      }
      out = out[sliced[i]];
    }
    out[sliced[i]] = value;
  } else if (typeof prop === 'function') {
    /* see the `function` handler in `get` */
    prop(this.dataSource.slice(row, row + 1)[0], value);
  } else {
    this.dataSource[row][prop] = value;
  }
};
