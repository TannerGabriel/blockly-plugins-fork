// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2024 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

'use strict';

import {registerCss} from '../src/css.js';
import './utilities.js';
import './workspace.js';
import './inputs/indented_input.js';
import './procedure_utils.js';
import {Flydown} from './fields/flydown.js';
import {FieldFlydown} from "./fields/field_flydown.js";
import {FieldGlobalFlydown} from "./fields/field_global_flydown.js";
import './fields/field_nocheck_dropdown.js';
import {FieldLexicalVariable, LexicalVariable} from './fields/field_lexical_variable.js';
import {FieldParameterFlydown} from './fields/field_parameter_flydown.js';
import {FieldProcedureName} from './fields/field_procedurename.js';
import {FieldNoCheckDropdown} from './fields/field_nocheck_dropdown.js';
import {NameSet} from './nameSet.js';
import * as Shared from './shared.js';
import {dataTypesEnabled, VariableTypeRegistry} from './shared.js';
import {Substitution} from './substitution.js';
import './procedure_database.js';
import * as Blockly from 'blockly/core';
import {GerasRenderer} from './renderers/geras.js';
import {lexicalVariableScopeMixin} from './mixins.js'

export class LexicalVariablesPlugin {

    /**
     * @param workspace
     */
    static init(workspace, options) {
        Blockly.types_ = options.types;

        // TODO(ewpatton): We need to make sure this is reentrant.
        const rendererName = workspace.getRenderer().getClassName();
        const themeName = workspace.getTheme().getClassName();
        const selector = `.${rendererName}.${themeName}`;
        registerCss(selector);

        // TODO: Might need the next line
        // Blockly.DropDownDiv.createDom();
        const flydown = new Flydown(
            new Blockly.Options({
                scrollbars: false,
                rtl: workspace.RTL,
                renderer: workspace.options.renderer,
                rendererOverrides: workspace.options.rendererOverrides,
                parentWorkspace: workspace,
            })
        );
        // ***** [lyn, 10/05/2013] NEED TO WORRY ABOUT MULTIPLE BLOCKLIES! *****
        workspace.flydown_ = flydown;
        Blockly.utils.dom.insertAfter(flydown.createDom('g'),
            workspace.svgBubbleCanvas_);
        flydown.init(workspace);
        flydown.autoClose = true; // Flydown closes after selecting a block

        if (dataTypesEnabled()) {
          workspace.addChangeListener(function(e) {
            if (e.type !== 'finished_loading') return;

            workspace.getAllBlocks(false).forEach(function(block) {
              if ((block.type === 'global_declaration' ||
                   block.type === 'global_declaration_array') &&
                  block.getVariableType) {
                const name = block.getFieldValue('NAME');
                const type = block.getVariableType();
                if (name) {
                  VariableTypeRegistry.setType(workspace, 'global ' + name, type);
                }
              }
            });

            workspace.getAllBlocks(false).forEach(function(block) {
              if (block.type === 'lexical_variable_get' ||
                  block.type === 'lexical_variable_set') {
                const field = block.fieldVar_;
                if (!field) return;

                const currentValue = field.getValue();
                const freshOptions = field.getOptions(false);
                const match = freshOptions.find(function(opt) {
                  return opt[1] === currentValue;
                });
                if (match) field.selectedOption = match;

                const type = block.getVariableType();
                if (block.type === 'lexical_variable_get') {
                  block.setOutput(true, type ? [type] : null);
                } else {
                  const inp = block.getInput('VALUE');
                  if (inp) inp.setCheck(type ? [type] : null);
                }
              } else if (block.type === 'procedures_callreturn') {
                const defBlock = Blockly.Procedures.getDefinition(
                    block.getFieldValue('PROCNAME'), workspace);
                if (defBlock && defBlock.getReturnType) {
                  const returnType = defBlock.getReturnType();
                  block.setOutput(true, returnType ? [returnType] : null);
                }
              }
            });
          });
        }
    }

    static Flydown = Flydown;
    static FieldFlydown = FieldFlydown;
    static FieldGlobalFlydown = FieldGlobalFlydown;
    static FieldParameterFlydown = FieldParameterFlydown;
    static lexicalVariableScopeMixin= lexicalVariableScopeMixin;
    static LexicalVariable = LexicalVariable;
    static FieldLexicalVariable = FieldLexicalVariable;
    static FieldProcedureName = FieldProcedureName;
    static FieldNoCheckDropdown = FieldNoCheckDropdown;
    static NameSet = NameSet;
    static Shared = Shared;
    static Substitution = Substitution;
}

Blockly.blockRendering.register('geras2_renderer', GerasRenderer);
