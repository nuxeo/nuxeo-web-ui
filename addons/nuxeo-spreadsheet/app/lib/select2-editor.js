/* eslint-disable max-len */
const Select2Editor = Handsontable.editors.TextEditor.prototype.extend();

Select2Editor.prototype.prepare = function (td, row, col, prop, value, cellProperties) {
  Handsontable.editors.TextEditor.prototype.prepare.apply(this, arguments);

  this.options = {};

  if (this.cellProperties.select2Options) {
    this.options = $.extend(this.options, cellProperties.select2Options);
  }
  // DEFAULT — keep dropdown open for multiselect
  if (this.cellProperties.multiple) {
    this.options.closeOnSelect = false;
  }
};

Select2Editor.prototype.createElements = function () {
  this.$body = $(document.body);
  this.wtDom = Handsontable.Dom;

  this.TEXTAREA = document.createElement('select');
  this.$textarea = $(this.TEXTAREA);

  this.wtDom.addClass(this.TEXTAREA, 'handsontableInput');

  this.textareaStyle = this.TEXTAREA.style;
  this.textareaStyle.width = 0;
  this.textareaStyle.height = 0;

  this.TEXTAREA_PARENT = document.createElement('DIV');
  this.wtDom.addClass(this.TEXTAREA_PARENT, 'handsontableInputHolder');

  this.textareaParentStyle = this.TEXTAREA_PARENT.style;
  this.textareaParentStyle.top = 0;
  this.textareaParentStyle.left = 0;
  this.textareaParentStyle.display = 'none';

  this.TEXTAREA_PARENT.appendChild(this.TEXTAREA);

  this.instance.rootElement[0].appendChild(this.TEXTAREA_PARENT);

  const that = this;
  Handsontable.hooks.add('afterRender', () => {
    // TODO(nfgs) - was that.instance.registerTimeout
    that.instance._registerTimeout(
      'refresh_editor_dimensions',
      () => {
        that.refreshDimensions();
      },
      0,
    );
  });
};

const onBeforeKeyDown = function onBeforeKeyDown(event) {
  const instance = this;
  const that = instance.getActiveEditor();

  const keyCodes = Handsontable.helper.keyCode;
  const ctrlDown = (event.ctrlKey || event.metaKey) && !event.altKey; // catch CTRL but not right ALT (which in some systems triggers ALT+CTRL)

  // Process only events that have been fired in the editor
  if (event.target !== that.TEXTAREA || event.isImmediatePropagationStopped()) {
    return;
  }

  if (event.keyCode === 17 || event.keyCode === 224 || event.keyCode === 91 || event.keyCode === 93) {
    // when CTRL or its equivalent is pressed and cell is edited, don't prepare selectable text in textarea
    event.stopImmediatePropagation();
    return;
  }

  // eslint-disable-next-line default-case
  switch (event.keyCode) {
    case keyCodes.ENTER:
      const selected = that.instance.getSelected();
      const isMultipleSelection = !(selected[0] === selected[2] && selected[1] === selected[3]);
      if ((ctrlDown && !isMultipleSelection) || event.altKey) {
        // if ctrl+enter or alt+enter, add new line
        if (that.isOpened()) {
          that.val(`${that.val()}\n`);
          that.focus();
        } else {
          that.beginEditing(`${that.originalValue}\n`);
        }
        event.stopImmediatePropagation();
      }
      event.preventDefault(); // don't add newline to field
      break;

    case keyCodes.A:
    case keyCodes.X:
    case keyCodes.C:
    case keyCodes.V:
      if (ctrlDown) {
        event.stopImmediatePropagation(); // CTRL+A, CTRL+C, CTRL+V, CTRL+X should only work locally when cell is edited (not in table context)
        break;
      }
    case keyCodes.HOME:
    case keyCodes.END:
      event.stopImmediatePropagation(); // home, end should only work locally when cell is edited (not in table context)
      break;
  }
};

Select2Editor.prototype.open = function () {
  this.instance.listen(false); // disable HOT auto-close behavior
  this.refreshDimensions();
  this.textareaParentStyle.display = 'block';
  this.instance.addHook('beforeKeyDown', onBeforeKeyDown);

  this.$textarea.css({
    height: $(this.TD).height(),
    width: $(this.TD).width(),
    'min-width': $(this.TD).width(),
  });

  const isMultiple = !!(this.cellProperties && this.cellProperties.multiple);

  this.TEXTAREA.multiple = isMultiple;

  // clear previous options
  this.$textarea.find('option').remove();

  // ensure cellLabels exists
  if (!this.cellLabels) this.cellLabels = {};

  let value = this.originalValue;
  // prepopulate options with correct text
  if (value != null) {
    const values = Array.isArray(value) ? value : [value];

    values.forEach((v) => {
      if (v == null) return;

      // Resolve label
      let text = this.getSelectionText(v);

      // Fallback: try Select2 option list
      if ((!text || text === v) && this.options.data) {
        const found = this.options.data.find((o) => o.id === v);
        if (found) {
          text = found.text;
          this.cellLabels[v] = found.text;
        }
      }

      // Create option
      const opt = new Option(text, v, true, true);
      this.$textarea.append(opt);
    });
  }

  this.$textarea.select2(this.options);

  // remove any previously attached handlers in this namespace
  this.$textarea.off('.htSelect2');

  this.$textarea.on('select2:select.htSelect2', (e) => {
    try {
      if (typeof this.onSelected === 'function') {
        this.onSelected(e);
      }
      if (!this.cellProperties.multiple) {
        this.finishEditing();
      }
    } catch (err) {
      console.error(err);
    }
  });

  this.$textarea.on('select2:unselect.htSelect2', (e) => {
    try {
      if (typeof this.onRemoved === 'function') {
        this.onRemoved(e);
      }
      if (!this.cellProperties.multiple) {
        this.finishEditing();
      }
    } catch (err) {
      console.error(err);
    }
  });
};

Select2Editor.prototype.getSelectionText = function (value) {
  if (this.cellLabels && this.cellLabels[value]) {
    return this.cellLabels[value];
  }
  return value || '';
};

Select2Editor.prototype.close = function () {
  this.instance.listen();
  // Remove hooks only if they exist
  if (this.instance) {
    this.instance.removeHook('beforeKeyDown', onBeforeKeyDown);
  }
  if (this.$textarea) {
    this.$textarea.off('.htSelect2');
    this.$textarea.hide();
  }
  this.isFinished = true;
  Handsontable.editors.TextEditor.prototype.close.apply(this, arguments);
};

Select2Editor.prototype.val = function (value) {
  if (value === undefined) {
    const v = this.$textarea.val();
    let result = [];
    if (Array.isArray(v)) {
      result = v;
    } else if (v) {
      result = [v];
    }
    return result;
  }

  if (Array.isArray(value)) {
    this.$textarea.val(value).trigger('change');
  } else {
    this.$textarea.val([value]).trigger('change');
  }
};

Select2Editor.prototype.focus = function () {
  this.instance.listen();

  // DO NOT CALL THE BASE TEXTEDITOR FOCUS METHOD HERE, IT CAN MAKE THIS EDITOR BEHAVE POORLY AND HAS NO PURPOSE WITHIN THE CONTEXT OF THIS EDITOR
  // Handsontable.editors.TextEditor.prototype.focus.apply(this, arguments);
};

Select2Editor.prototype.beginEditing = function (...params) {
  const { onBeginEditing } = this.instance.getSettings();
  if (onBeginEditing && onBeginEditing() === false) {
    return;
  }

  Handsontable.editors.TextEditor.prototype.beginEditing.apply(this, params);
};

Select2Editor.prototype.finishEditing = function () {
  this.instance.listen();
  this.isFinished = true;

  return Handsontable.editors.TextEditor.prototype.finishEditing.call(this, false);
};

Handsontable.editors.Select2Editor = Select2Editor;
Handsontable.editors.registerEditor('select2', Select2Editor);
