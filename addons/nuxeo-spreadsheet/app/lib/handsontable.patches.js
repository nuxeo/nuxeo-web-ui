/* eslint-disable no-else-return, no-prototype-builtins */

/**
 * Returns single value from the data array.
 *
 * @param {Number} row
 * @param {Number} prop
 */
Handsontable.DataMap.prototype.get = function(row, prop) {
  row = Handsontable.hooks.run(this.instance, 'modifyRow', row);

  const dataRow = this.dataSource[row];

  // try to get value under property `prop` (includes dot)
  if (dataRow && dataRow.hasOwnProperty && dataRow.hasOwnProperty(prop)) {
    return dataRow[prop];
  } else if (typeof prop === 'string' && prop.indexOf('.') > -1) {
    let sliced = prop.split('.');
    let out = dataRow;

    if (!out) {
      return null;
    }
    for (let i = 0, ilen = sliced.length; i < ilen; i++) {
      out = out[sliced[i]];

      // NXP-28923 -  if (typeof out === 'undefined') {
      if (typeof out === 'undefined') {
        // out == null) {
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
  }

  return null;
};

/**
 * Saves single value to the data array.
 *
 * @param {Number} row
 * @param {Number} prop
 * @param {String} value
 * @param {String} [source] Source of hook runner.
 */
Handsontable.DataMap.prototype.set = function(row, prop, value, source) {
  row = Handsontable.hooks.run(this.instance, 'modifyRow', row, source || 'datamapGet');

  const dataRow = this.dataSource[row];

  // try to set value under property `prop` (includes dot)
  if (dataRow && dataRow.hasOwnProperty && dataRow.hasOwnProperty(prop)) {
    dataRow[prop] = value;
  } else if (typeof prop === 'string' && prop.indexOf('.') > -1) {
    let sliced = prop.split('.');
    let out = dataRow;
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
    dataRow[prop] = value;
  }
};
