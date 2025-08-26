// -*- mode: javascript; c-basic-offset: 2; -*-
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
import {createPlayground} from '@blockly/dev-tools';
import {LexicalVariablesPlugin} from '../src/index.js';
import '../src/blocks.js';

// Blocks shown in the "Misc. Blocks" category.
const miscBlocks = [
  'global_declaration',
  'controls_for',
  'controls_forRange',
  'controls_forEach',
  'local_declaration_statement',
  'simple_local_declaration_statement',
  'local_declaration_expression',
  'controls_do_then_return',
];

// Shared list for Variables category.
const variableBlocks = [
  'global_declaration',
  'global_declaration_array',
  'simple_local_declaration_statement',
  'local_declaration_statement',
  'local_declaration_expression',
  'lexical_variable_get',
  'lexical_variable_set',
];

// JSON toolbox definition (V12 style).
const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Misc. Blocks',
      colour: '370',
      contents: miscBlocks.map(type => ({kind: 'block', type})),
    },
    {kind: 'sep'},
    {
      kind: 'category',
      id: 'catVariables',
      name: 'Variables',
      colour: '330',
      contents: variableBlocks.map(type => ({kind: 'block', type})),
    },
    {
      kind: 'category',
      id: 'catFunctions',
      name: 'Functions',
      colour: '290',
      custom: 'CUSTOM_PROCEDURE',
    },
  ],
};

/**
 * Create a workspace.
 * @param {HTMLElement} blocklyDiv
 * @param {!Blockly.BlocklyOptions} options
 * @return {!Blockly.WorkspaceSvg}
 */
function createWorkspace(blocklyDiv, options) {
  const workspace = Blockly.inject(blocklyDiv, options);

  LexicalVariablesPlugin.init(workspace, {
    types: {
      enableDataTypes: true,
      dataTypes: [
        ['int', 'int'],
        ['float', 'float'],
        ['boolean', 'boolean'],
        ['char*', 'String'],
        ['Array<int>', 'Array<int>'],
        ['Array<float>', 'Array<float>'],
        ['Array<boolean>', 'Array<boolean>'],
        ['Array<char*>', 'Array<String>'],
        ['Map<String, int>', 'Map<String, int>'],
      ],
      loopType: 'int',
      defaultType: 'int',
    },
  });

  workspace.registerToolboxCategoryCallback(
    'CUSTOM_PROCEDURE',
    function(ws) {
      const xmlList = Blockly.Procedures.flyoutCategory(ws);
      const earlyReturn = document.createElement('block');
      earlyReturn.setAttribute('type', 'procedures_early_return');
      xmlList.push(earlyReturn);
      return xmlList;
    }
  );

  return workspace;
}

Blockly.setLocale(En);

document.addEventListener('DOMContentLoaded', function() {
  const defaultOptions = {
    toolbox, // JSON toolbox object
    collapse: true,
  };
  createPlayground(document.getElementById('root'), createWorkspace, defaultOptions);
});