/**
 * @license
 * @fileoverview Regression tests for lexical local declarations and mutators.
 */

import * as Blockly from 'blockly/core';

import '../src/msg.js';
import '../src/utilities.js';
import '../src/workspace.js';
import '../src/fields/flydown.js';
import '../src/fields/field_flydown.js';
import '../src/fields/field_parameter_flydown.js';
import '../src/blocks/lexical-variables.js';
import * as Shared from '../src/shared.js';

import chai from 'chai';

const TEST_TYPES = [
  ['int', 'int'],
  ['float', 'float'],
  ['boolean', 'boolean'],
];

function enableStaticTypes() {
  Blockly.types_ = {
    enableDataTypes: true,
    dataTypes: TEST_TYPES,
    loopType: 'int',
    defaultType: 'int',
  };
}

function disableStaticTypes() {
  delete Blockly.types_;
}

function createWorkspace() {
  const workspace = new Blockly.Workspace();
  Blockly.common.setMainWorkspace(workspace);
  return workspace;
}

function loadWorkspaceXml(workspace, xmlText) {
  const xml = Blockly.utils.xml.textToDom(xmlText);
  Blockly.Xml.domToWorkspace(xml, workspace);
}

function createTwoLocalDeclarationXml(typeAttributes) {
  const firstType = typeAttributes ? ' type="int"' : '';
  const secondType = typeAttributes ? ' type="boolean"' : '';
  return '<xml>' +
    '  <block type="local_declaration_statement" id="twoLocals">' +
    '    <mutation>' +
    '      <localname name="alpha"' + firstType + '></localname>' +
    '      <localname name="beta"' + secondType + '></localname>' +
    '    </mutation>' +
    '    <field name="VAR0">alpha</field>' +
    '    <field name="VAR1">beta</field>' +
    '  </block>' +
    '</xml>';
}

function createDuplicateLocalDeclarationXml() {
  return '<xml>' +
    '  <block type="local_declaration_statement" id="duplicateLocals">' +
    '    <mutation>' +
    '      <localname name="alpha"></localname>' +
    '      <localname name="alpha"></localname>' +
    '    </mutation>' +
    '    <field name="VAR0">alpha</field>' +
    '    <field name="VAR1">alpha</field>' +
    '  </block>' +
    '</xml>';
}

function createNestedSameNameDeclarationXml() {
  return '<xml>' +
    '  <block type="local_declaration_statement" id="outerLocal">' +
    '    <mutation>' +
    '      <localname name="item"></localname>' +
    '    </mutation>' +
    '    <field name="VAR0">item</field>' +
    '    <statement name="STACK">' +
    '      <block type="local_declaration_statement" id="innerLocal">' +
    '        <mutation>' +
    '          <localname name="item"></localname>' +
    '        </mutation>' +
    '        <field name="VAR0">item</field>' +
    '      </block>' +
    '    </statement>' +
    '  </block>' +
    '</xml>';
}

function collectMutatorArgNames(containerBlock) {
  const names = [];
  let arg = containerBlock.getInputTargetBlock('STACK');
  while (arg) {
    names.push(arg.getFieldValue('NAME'));
    arg = arg.nextConnection && arg.nextConnection.targetBlock();
  }
  return names;
}

function collectMutatorArgTypes(containerBlock) {
  const types = [];
  let arg = containerBlock.getInputTargetBlock('STACK');
  while (arg) {
    if (arg.getField('TYPE')) {
      types.push(arg.getFieldValue('TYPE'));
    }
    arg = arg.nextConnection && arg.nextConnection.targetBlock();
  }
  return types;
}

function appendMutatorArg(workspace, containerBlock, name, type) {
  const arg = workspace.newBlock('local_mutatorarg');
  if (arg.initSvg) {
    arg.initSvg();
  }
  arg.setFieldValue(name, 'NAME');
  if (arg.getField('TYPE') && type) {
    arg.setFieldValue(type, 'TYPE');
  }

  let connection = containerBlock.getInput('STACK').connection;
  let tail = containerBlock.getInputTargetBlock('STACK');
  while (tail && tail.nextConnection && tail.nextConnection.targetBlock()) {
    tail = tail.nextConnection.targetBlock();
  }
  if (tail && tail.nextConnection) {
    connection = tail.nextConnection;
  }
  connection.connect(arg.previousConnection);
  return arg;
}

function createMutatorContainer(workspace, block, entries) {
  const container = workspace.newBlock('local_mutatorcontainer');
  if (container.initSvg) {
    container.initSvg();
  }
  container.setDefBlock(block);
  entries.forEach(function(entry) {
    appendMutatorArg(workspace, container, entry.name, entry.type);
  });
  return container;
}

function attachModernOpenMutator(block, mutatorWorkspace) {
  block.mutator = {
    bubbleIsVisible: function() {
      return true;
    },
    getWorkspace: function() {
      return mutatorWorkspace;
    },
    dispose: function() {},
  };
}

function assertScopedLocalMetadata(block, expectedEntries) {
  const scopedEntries = [];
  block.withLexicalVarsAndPrefix(null, function(name, prefix, translated, type) {
    scopedEntries.push({name, prefix, translated, type});
  });
  chai.assert.deepEqual(scopedEntries, expectedEntries.map(function(entry) {
    return {
      name: entry.name,
      prefix: Shared.localNamePrefix,
      translated: '',
      type: entry.type,
    };
  }));
}

suite('LexicalVariableMutatorRegression', function() {
  setup(function() {
    disableStaticTypes();
    this.workspace = createWorkspace();
  });

  teardown(function() {
    if (this.workspace) {
      this.workspace.dispose();
    }
    delete this.workspace;
    disableStaticTypes();
  });

  test('loads multiple lexical variables from legacy mutation XML',
      function() {
        chai.assert.doesNotThrow(function() {
          loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(false));
        }.bind(this));

        const block = this.workspace.getBlockById('twoLocals');
        chai.assert.deepEqual(block.declaredNames(), ['alpha', 'beta']);
        chai.assert.isOk(block.getInput('DECL0'));
        chai.assert.isOk(block.getInput('DECL1'));
        chai.assert.isOk(block.getInput('STACK'));
      });

  test('decomposes the local declaration mutator for multiple legacy variables',
      function() {
        loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(false));
        const block = this.workspace.getBlockById('twoLocals');
        const mutatorWorkspace = createWorkspace();
        let container;

        try {
          chai.assert.doesNotThrow(function() {
            container = block.decompose(mutatorWorkspace);
          });

          chai.assert.isOk(container);
          chai.assert.deepEqual(
              collectMutatorArgNames(container), ['alpha', 'beta']);
        } finally {
          mutatorWorkspace.dispose();
        }
      });

  test('reads entries from an open modern Blockly mutator workspace',
      function() {
        enableStaticTypes();
        loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(true));
        const block = this.workspace.getBlockById('twoLocals');
        const mutatorWorkspace = createWorkspace();

        try {
          const container = block.decompose(mutatorWorkspace);
          attachModernOpenMutator(block, mutatorWorkspace);

          chai.assert.deepEqual(
              collectMutatorArgNames(container), ['alpha', 'beta']);
          chai.assert.doesNotThrow(function() {
            chai.assert.deepEqual(
                block.getVariableTypes(), ['int', 'boolean']);
          });
        } finally {
          mutatorWorkspace.dispose();
        }
      });

  test('closing a modern Blockly mutator without changes preserves locals',
      function() {
        enableStaticTypes();
        loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(true));
        const block = this.workspace.getBlockById('twoLocals');
        const mutatorWorkspace = createWorkspace();

        try {
          const container = block.decompose(mutatorWorkspace);
          attachModernOpenMutator(block, mutatorWorkspace);

          chai.assert.doesNotThrow(function() {
            block.compose(container);
          });

          chai.assert.deepEqual(block.declaredNames(), ['alpha', 'beta']);
          chai.assert.deepEqual(block.getVariableTypes(), ['int', 'boolean']);
          chai.assert.deepEqual(
              block.getInput('DECL0').connection.getCheck(), ['int']);
          chai.assert.deepEqual(
              block.getInput('DECL1').connection.getCheck(), ['boolean']);
        } finally {
          mutatorWorkspace.dispose();
        }
      });

  test('closing a modern Blockly mutator applies valid local changes',
      function() {
        enableStaticTypes();
        loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(true));
        const block = this.workspace.getBlockById('twoLocals');
        const mutatorWorkspace = createWorkspace();

        try {
          const container = createMutatorContainer(mutatorWorkspace, block, [
            {name: 'alpha', type: 'int'},
            {name: 'gamma', type: 'float'},
          ]);
          attachModernOpenMutator(block, mutatorWorkspace);

          chai.assert.doesNotThrow(function() {
            block.compose(container);
          });

          chai.assert.deepEqual(block.declaredNames(), ['alpha', 'gamma']);
          chai.assert.deepEqual(block.getVariableTypes(), ['int', 'float']);
          chai.assert.deepEqual(
              collectMutatorArgNames(container), ['alpha', 'gamma']);
          chai.assert.deepEqual(
              collectMutatorArgTypes(container), ['int', 'float']);
        } finally {
          mutatorWorkspace.dispose();
        }
      });

  test('renames entries in an open modern Blockly mutator workspace',
      function() {
        enableStaticTypes();
        loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(true));
        const block = this.workspace.getBlockById('twoLocals');
        const mutatorWorkspace = createWorkspace();

        try {
          const container = block.decompose(mutatorWorkspace);
          attachModernOpenMutator(block, mutatorWorkspace);
          const substitution = {
            map: function(names) {
              return names.map(function(name) {
                return name === 'alpha' ? 'gamma' : name;
              });
            },
            apply: function(name) {
              return name === 'alpha' ? 'gamma' : name;
            },
          };

          chai.assert.doesNotThrow(function() {
            block.renameVars(substitution);
          });

          chai.assert.deepEqual(block.declaredNames(), ['gamma', 'beta']);
          chai.assert.deepEqual(
              collectMutatorArgNames(container), ['gamma', 'beta']);
        } finally {
          mutatorWorkspace.dispose();
        }
      });

  test('preserves multiple lexical variable types when static types are on',
      function() {
        enableStaticTypes();

        chai.assert.doesNotThrow(function() {
          loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(true));
        }.bind(this));

        const block = this.workspace.getBlockById('twoLocals');
        chai.assert.deepEqual(block.declaredNames(), ['alpha', 'beta']);
        chai.assert.deepEqual(block.getVariableTypes(), ['int', 'boolean']);
        chai.assert.deepEqual(
            block.getInput('DECL0').connection.getCheck(), ['int']);
        chai.assert.deepEqual(
            block.getInput('DECL1').connection.getCheck(), ['boolean']);
      });

  test('serializes and deserializes multiple typed lexical variables',
      function() {
        enableStaticTypes();
        loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(true));
        const block = this.workspace.getBlockById('twoLocals');
        const state = Blockly.serialization.blocks.save(block);

        chai.assert.deepEqual(state.extraState.names, ['alpha', 'beta']);
        chai.assert.deepEqual(state.extraState.types, ['int', 'boolean']);
        assertScopedLocalMetadata(block, [
          {name: 'alpha', type: 'int'},
          {name: 'beta', type: 'boolean'},
        ]);

        const reloadedWorkspace = createWorkspace();
        try {
          let reloadedBlock;
          chai.assert.doesNotThrow(function() {
            reloadedBlock =
                Blockly.serialization.blocks.append(state, reloadedWorkspace);
          });

          chai.assert.deepEqual(
              reloadedBlock.declaredNames(), ['alpha', 'beta']);
          chai.assert.deepEqual(
              reloadedBlock.getVariableTypes(), ['int', 'boolean']);
          chai.assert.deepEqual(
              reloadedBlock.getInput('DECL0').connection.getCheck(), ['int']);
          chai.assert.deepEqual(
              reloadedBlock.getInput('DECL1').connection.getCheck(),
              ['boolean']);
          assertScopedLocalMetadata(reloadedBlock, [
            {name: 'alpha', type: 'int'},
            {name: 'beta', type: 'boolean'},
          ]);
        } finally {
          reloadedWorkspace.dispose();
        }
      });

  test('keeps saved local variable state stable after later edits',
      function() {
        enableStaticTypes();
        loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(true));
        const block = this.workspace.getBlockById('twoLocals');
        const state = Blockly.serialization.blocks.save(block);

        block.updateDeclarationInputs_(['gamma'], ['float']);

        chai.assert.deepEqual(state.extraState.names, ['alpha', 'beta']);
        chai.assert.deepEqual(state.extraState.types, ['int', 'boolean']);

        const reloadedWorkspace = createWorkspace();
        try {
          const reloadedBlock =
              Blockly.serialization.blocks.append(state, reloadedWorkspace);
          chai.assert.deepEqual(
              reloadedBlock.declaredNames(), ['alpha', 'beta']);
          chai.assert.deepEqual(
              reloadedBlock.getVariableTypes(), ['int', 'boolean']);
        } finally {
          reloadedWorkspace.dispose();
        }
      });

  test('removes one mutator variable without corrupting remaining metadata',
      function() {
        enableStaticTypes();
        loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(true));
        const block = this.workspace.getBlockById('twoLocals');
        const mutatorWorkspace = createWorkspace();

        try {
          const container = createMutatorContainer(mutatorWorkspace, block, [
            {name: 'beta', type: 'boolean'},
          ]);

          chai.assert.doesNotThrow(function() {
            block.compose(container);
          });

          chai.assert.deepEqual(block.declaredNames(), ['beta']);
          chai.assert.deepEqual(block.getVariableTypes(), ['boolean']);
          chai.assert.deepEqual(
              block.getInput('DECL0').connection.getCheck(), ['boolean']);
          chai.assert.isNull(block.getInput('DECL1'));

          const state = Blockly.serialization.blocks.save(block);
          chai.assert.deepEqual(state.extraState.names, ['beta']);
          chai.assert.deepEqual(state.extraState.types, ['boolean']);
          assertScopedLocalMetadata(block, [{name: 'beta', type: 'boolean'}]);
        } finally {
          mutatorWorkspace.dispose();
        }
      });

  test('reorders and updates mutator variables while preserving valid state',
      function() {
        enableStaticTypes();
        loadWorkspaceXml(this.workspace, createTwoLocalDeclarationXml(true));
        const block = this.workspace.getBlockById('twoLocals');
        const mutatorWorkspace = createWorkspace();

        try {
          const container = createMutatorContainer(mutatorWorkspace, block, [
            {name: 'beta', type: 'boolean'},
            {name: 'gamma', type: 'float'},
          ]);

          chai.assert.doesNotThrow(function() {
            block.compose(container);
          });

          chai.assert.deepEqual(block.declaredNames(), ['beta', 'gamma']);
          chai.assert.deepEqual(block.getVariableTypes(), ['boolean', 'float']);
          chai.assert.deepEqual(
              collectMutatorArgNames(container), ['beta', 'gamma']);
          chai.assert.deepEqual(
              collectMutatorArgTypes(container), ['boolean', 'float']);
          chai.assert.deepEqual(
              block.getInput('DECL0').connection.getCheck(), ['boolean']);
          chai.assert.deepEqual(
              block.getInput('DECL1').connection.getCheck(), ['float']);
          assertScopedLocalMetadata(block, [
            {name: 'beta', type: 'boolean'},
            {name: 'gamma', type: 'float'},
          ]);
        } finally {
          mutatorWorkspace.dispose();
        }
      });

  test('normalizes duplicate lexical variables loaded in one scope',
      function() {
        loadWorkspaceXml(this.workspace, createDuplicateLocalDeclarationXml());

        const block = this.workspace.getBlockById('duplicateLocals');
        chai.assert.deepEqual(block.declaredNames(), ['alpha', 'alpha2']);
        chai.assert.equal(block.getFieldValue('VAR0'), 'alpha');
        chai.assert.equal(block.getFieldValue('VAR1'), 'alpha2');
      });

  test('normalizes duplicate lexical variables composed from mutator',
      function() {
        loadWorkspaceXml(this.workspace, '<xml>' +
          '  <block type="local_declaration_statement" id="localDecl">' +
          '    <mutation>' +
          '      <localname name="alpha"></localname>' +
          '    </mutation>' +
          '    <field name="VAR0">alpha</field>' +
          '  </block>' +
          '</xml>');
        const block = this.workspace.getBlockById('localDecl');
        const mutatorWorkspace = createWorkspace();

        try {
          const container = block.decompose(mutatorWorkspace);
          appendMutatorArg(mutatorWorkspace, container, 'alpha');

          block.compose(container);

          chai.assert.deepEqual(block.declaredNames(), ['alpha', 'alpha2']);
        } finally {
          mutatorWorkspace.dispose();
        }
      });

  test('keeps same lexical variable name in nested different scopes',
      function() {
        loadWorkspaceXml(this.workspace, createNestedSameNameDeclarationXml());

        const outerBlock = this.workspace.getBlockById('outerLocal');
        const innerBlock = this.workspace.getBlockById('innerLocal');
        chai.assert.deepEqual(outerBlock.declaredNames(), ['item']);
        chai.assert.deepEqual(innerBlock.declaredNames(), ['item']);
      });
});
