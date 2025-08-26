import * as Blockly from 'blockly/core';

export class FieldTypeDropdown extends Blockly.FieldDropdown {
  constructor(value = 'int') {
    // Start with an empty generator; we'll replace it immediately.
    super(() => []);
    this._custom = [];

    // Build the menu each time so custom entries show up.
    this.menuGenerator_ = () => [
      ...FieldTypeDropdown.BASIC,
      ...this._custom,
      ['Custom…', FieldTypeDropdown.CUSTOM],
    ];

    this.setValue(value);
  }

  // Minimal behavior: no validation. If "Custom…" is chosen, prompt and set whatever is typed.
  doClassValidation_(val) {
    if (val === FieldTypeDropdown.CUSTOM) {
      const prev = this.getValue() || 'int';

      const promptFn =
        Blockly.prompt ||
        ((msg, def, cb) => cb(window.prompt(msg, def)));

      promptFn(
        'Enter a type (e.g. int[][], Array<Array<int>>, map<string,int>):',
        prev,
        (text) => {
          const v = (text || '').trim();
          if (v) {
            this.addCustom_(v);
            this.setValue(v);
          } else {
            this.setValue(prev);
          }
        }
      );
      // Cancel the "Custom…" selection itself; we'll set the real value in the callback.
      return null;
    }

    if (typeof val === 'string' && val) {
      this.addCustom_(val);
      return val; // accept anything
    }
    return null;
  }

  addCustom_(v) {
    const exists =
      FieldTypeDropdown.BASIC.some(([, val]) => val === v) ||
      this._custom.some(([, val]) => val === v);
    if (!exists) this._custom.push([v, v]);
  }

  // JSON support so you can use it in block JSON definitions:
  static fromJson(options) {
    return new FieldTypeDropdown(options && options.value);
  }
}

// "static" props (kept here for wide compatibility)
FieldTypeDropdown.CUSTOM = '__CUSTOM__';
FieldTypeDropdown.BASIC = [
  ['int', 'int'],
  ['float', 'float'],
  ['boolean', 'boolean'],
  ['string', 'string'],
  ['char*', 'char*'],
];

// Register so it can be referenced by name in JSON ("field_typedropdown")
Blockly.fieldRegistry.register('field_typedropdown', FieldTypeDropdown);
