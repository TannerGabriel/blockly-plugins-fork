/**
 * @license
 * @fileoverview Static variable type contract tests.
 */

import * as Blockly from 'blockly/core';

import '../src/msg.js';
import '../src/utilities.js';
import '../src/workspace.js';
import '../src/fields/flydown.js';
import '../src/fields/field_flydown.js';
import '../src/fields/field_global_flydown.js';
import '../src/fields/field_nocheck_dropdown.js';
import '../src/fields/field_lexical_variable.js';
import '../src/fields/field_parameter_flydown.js';
import '../src/blocks/lexical-variables.js';
import '../src/blocks/variable-get-set.js';

import chai from 'chai';

const TEST_TYPES = [
  ['int', 'int'],
  ['float', 'float'],
  ['boolean', 'boolean'],
  ['char*', 'String'],
];

const STATIC_VARIABLE_BLOCKS = {
  global: {
    declarations: ['global_declaration', 'global_declaration_array'],
    getter: 'lexical_variable_get',
    setter: 'lexical_variable_set',
  },
  lexical: {
    declarations: [
      'simple_local_declaration_statement',
      'local_declaration_statement',
      'local_declaration_expression',
    ],
    getter: 'lexical_variable_get',
    setter: 'lexical_variable_set',
  },
};

const TYPED_TEST_VALUE_BLOCK = 'static_variable_test_value';

Blockly.Blocks[TYPED_TEST_VALUE_BLOCK] = {
  init: function() {
    this.setOutput(true, null);
  },
};

function enableStaticTypes() {
  Blockly.types_ = {
    enableDataTypes: true,
    dataTypes: TEST_TYPES,
    loopType: 'int',
    defaultType: 'int',
  };
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

function loadGeneratedGetterSetterXml(workspace, xmlText, idPrefix) {
  const xml = Blockly.utils.xml.textToDom(xmlText);
  const blocks = Array.from(xml.children).filter(function(child) {
    return child.nodeName.toLowerCase() === 'block';
  });
  blocks[0].setAttribute('id', idPrefix + 'Get');
  blocks[1].setAttribute('id', idPrefix + 'Set');
  Blockly.Xml.domToWorkspace(xml, workspace);
  return {
    getter: workspace.getBlockById(idPrefix + 'Get'),
    setter: workspace.getBlockById(idPrefix + 'Set'),
  };
}

function serializeWorkspace(workspace) {
  return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
}

function reloadWorkspaceFromXml(xmlText) {
  const workspace = createWorkspace();
  loadWorkspaceXml(workspace, xmlText);
  return workspace;
}

function getOnlySerializedBlock(xmlText, blockId) {
  const dom = Blockly.utils.xml.textToDom(xmlText);
  const blocks = Array.from(dom.getElementsByTagName('block'));
  return blocks.find(function(block) {
    return block.getAttribute('id') === blockId;
  });
}

function createGlobalVariableFixture(workspace, type, options = {}) {
  const name = options.name || 'score';
  const declId = options.declId || 'globalDecl';
  const getId = options.getId || 'globalGet';
  const setId = options.setId || 'globalSet';
  const declarationType = options.declarationType || 'global_declaration';
  const dimension = options.dimension || '1';
  loadWorkspaceXml(workspace, '<xml>' +
    '  <block type="' + declarationType + '" id="' + declId + '">' +
    (declarationType === 'global_declaration_array' ?
      '    <field name="DIMENSION">' + dimension + '</field>' :
      '') +
    '    <field name="TYPE">' + type + '</field>' +
    '    <field name="NAME">' + name + '</field>' +
    '  </block>' +
    '  <block type="lexical_variable_set" id="' + setId + '">' +
    '    <field name="VAR">global ' + name + '</field>' +
    '    <value name="VALUE">' +
    '      <block type="lexical_variable_get" id="' + getId + '">' +
    '        <field name="VAR">global ' + name + '</field>' +
    '      </block>' +
    '    </value>' +
    '  </block>' +
  '</xml>');
  const fixture = {
    declaration: workspace.getBlockById(declId),
    getter: workspace.getBlockById(getId),
    setter: workspace.getBlockById(setId),
  };
  syncUsageChecks(fixture, type);
  return fixture;
}

function createGlobalVariableUsages(workspace, name, idPrefix) {
  const getter = workspace.newBlock('lexical_variable_get', idPrefix + 'Get');
  getter.setFieldValue('global ' + name, 'VAR');
  const setter = workspace.newBlock('lexical_variable_set', idPrefix + 'Set');
  setter.setFieldValue('global ' + name, 'VAR');
  return {getter, setter};
}

function createToolboxVariableUsages(workspace, variableName, idPrefix) {
  return loadGeneratedGetterSetterXml(workspace, '<xml>' +
    '  <block type="lexical_variable_get">' +
    '    <field name="VAR">' + variableName + '</field>' +
    '  </block>' +
    '  <block type="lexical_variable_set">' +
    '    <field name="VAR">' + variableName + '</field>' +
    '  </block>' +
    '</xml>', idPrefix);
}

function createSimpleLocalVariableFixture(workspace, type, options = {}) {
  const name = options.name || 'item';
  const declId = options.declId || 'localDecl';
  const getId = options.getId || 'localGet';
  const setId = options.setId || 'localSet';
  loadWorkspaceXml(workspace, '<xml>' +
    '  <block type="simple_local_declaration_statement" id="' + declId + '">' +
    '    <field name="TYPE">' + type + '</field>' +
    '    <field name="VAR">' + name + '</field>' +
    '    <statement name="DO">' +
    '      <block type="lexical_variable_set" id="' + setId + '">' +
    '        <field name="VAR">' + name + '</field>' +
    '        <value name="VALUE">' +
    '          <block type="lexical_variable_get" id="' + getId + '">' +
    '            <field name="VAR">' + name + '</field>' +
    '          </block>' +
    '        </value>' +
    '      </block>' +
    '    </statement>' +
    '  </block>' +
    '</xml>');
  const fixture = {
    declaration: workspace.getBlockById(declId),
    getter: workspace.getBlockById(getId),
    setter: workspace.getBlockById(setId),
  };
  syncUsageChecks(fixture, type);
  return fixture;
}

function createSimpleLocalVariableUsages(workspace, declaration, name, idPrefix) {
  const setter = workspace.newBlock('lexical_variable_set', idPrefix + 'Set');
  let connection = declaration.getInput('DO').connection;
  let tail = declaration.getInputTargetBlock('DO');
  while (tail && tail.nextConnection && tail.nextConnection.targetBlock()) {
    tail = tail.nextConnection.targetBlock();
  }
  if (tail && tail.nextConnection) {
    connection = tail.nextConnection;
  }
  connection.connect(setter.previousConnection);
  setter.setFieldValue(name, 'VAR');

  const getter = workspace.newBlock('lexical_variable_get', idPrefix + 'Get');
  setter.getInput('VALUE').connection.connect(getter.outputConnection);
  getter.setFieldValue(name, 'VAR');
  return {getter, setter};
}

function createMutationLocalVariableFixture(workspace, type) {
  loadWorkspaceXml(workspace, '<xml>' +
    '  <block type="local_declaration_statement" id="mutationLocalDecl">' +
    '    <mutation>' +
    '      <localname name="item" type="' + type + '"></localname>' +
    '    </mutation>' +
    '    <field name="VAR0">item</field>' +
    '    <statement name="STACK">' +
    '      <block type="lexical_variable_set" id="mutationLocalSet">' +
    '        <field name="VAR">item</field>' +
    '        <value name="VALUE">' +
    '          <block type="lexical_variable_get" id="mutationLocalGet">' +
    '            <field name="VAR">item</field>' +
    '          </block>' +
    '        </value>' +
    '      </block>' +
    '    </statement>' +
    '  </block>' +
    '</xml>');
  const fixture = {
    declaration: workspace.getBlockById('mutationLocalDecl'),
    getter: workspace.getBlockById('mutationLocalGet'),
    setter: workspace.getBlockById('mutationLocalSet'),
  };
  syncUsageChecks(fixture, type);
  return fixture;
}

function createMutationLocalExpressionFixture(workspace, type) {
  loadWorkspaceXml(workspace, '<xml>' +
    '  <block type="local_declaration_expression" id="mutationExprDecl">' +
    '    <mutation>' +
    '      <localname name="item" type="' + type + '"></localname>' +
    '    </mutation>' +
    '    <field name="VAR0">item</field>' +
    '    <value name="RETURN">' +
    '      <block type="lexical_variable_get" id="mutationExprGet">' +
    '        <field name="VAR">item</field>' +
    '      </block>' +
    '    </value>' +
    '  </block>' +
    '</xml>');
  const fixture = {
    declaration: workspace.getBlockById('mutationExprDecl'),
    getter: workspace.getBlockById('mutationExprGet'),
  };
  fixture.getter.changeVariableType(type);
  return fixture;
}

function syncUsageChecks(fixture, type) {
  fixture.getter.changeVariableType(type);
  fixture.setter.changeVariableType(type);
}

function createTypedValueBlock(workspace, id, check) {
  const block = workspace.newBlock(TYPED_TEST_VALUE_BLOCK, id);
  block.outputConnection.setCheck(check);
  return block;
}

function connectTypedValueToSetter(workspace, setter, id, check) {
  const inputConnection = setter.getInput('VALUE').connection;
  if (inputConnection.isConnected()) {
    inputConnection.disconnect();
  }
  const valueBlock = createTypedValueBlock(workspace, id, check);
  inputConnection.connect(valueBlock.outputConnection);
  return valueBlock;
}

function assertGetterOutputCheck(block, type) {
  chai.assert.deepEqual(block.outputConnection.getCheck(), [type]);
}

function assertSetterInputCheck(block, type) {
  chai.assert.deepEqual(block.getInput('VALUE').connection.getCheck(), [type]);
}

function assertUsageChecks(fixture, type) {
  assertGetterOutputCheck(fixture.getter, type);
  assertSetterInputCheck(fixture.setter, type);
}

function assertFlydownXmlIncludesType(xmlText, type) {
  const xml = Blockly.utils.xml.textToDom(xmlText);
  const mutations = Array.from(xml.getElementsByTagName('mutation'));
  chai.assert.equal(mutations.length, 2);
  mutations.forEach(function(mutation) {
    chai.assert.equal(mutation.getAttribute('type'), type);
  });
}

function assertSetterValueConnected(setter, valueBlock) {
  chai.assert.equal(setter.getInputTargetBlock('VALUE'), valueBlock);
  chai.assert.isTrue(valueBlock.outputConnection.isConnected());
}

function assertSetterValueDisconnected(workspace, setter, valueBlock) {
  chai.assert.isNull(setter.getInputTargetBlock('VALUE'));
  chai.assert.isFalse(valueBlock.outputConnection.isConnected());
  chai.assert.equal(workspace.getBlockById(valueBlock.id), valueBlock);
  chai.assert.equal(valueBlock.workspace, workspace);
}

function assertSerializedFieldType(xmlText, blockId, fieldName, type) {
  const block = getOnlySerializedBlock(xmlText, blockId);
  chai.assert.isOk(block, blockId);
  const fields = Array.from(block.getElementsByTagName('field'));
  const field = fields.find(function(field) {
    return field.getAttribute('name') === fieldName;
  });
  chai.assert.isOk(field, fieldName);
  chai.assert.equal(field.textContent, type);
}

function assertSerializedLocalMutationType(xmlText, blockId, type) {
  const block = getOnlySerializedBlock(xmlText, blockId);
  const localNames = block.getElementsByTagName('localname');
  chai.assert.equal(localNames.length, 1);
  chai.assert.equal(localNames[0].getAttribute('type'), type);
}

suite('StaticVariableTypeContract', function() {
  setup(function() {
    enableStaticTypes();
    this.workspace = createWorkspace();
  });

  teardown(function() {
    delete this.workspace;
    delete Blockly.types_;
  });

  test('identifies the global and lexical variable blocks under contract',
      function() {
        STATIC_VARIABLE_BLOCKS.global.declarations.forEach(function(type) {
          chai.assert.isObject(Blockly.Blocks[type], type);
        });
        STATIC_VARIABLE_BLOCKS.lexical.declarations.forEach(function(type) {
          chai.assert.isObject(Blockly.Blocks[type], type);
        });
        chai.assert.isObject(Blockly.Blocks[STATIC_VARIABLE_BLOCKS.global.getter]);
        chai.assert.isObject(Blockly.Blocks[STATIC_VARIABLE_BLOCKS.global.setter]);
        chai.assert.equal(
            STATIC_VARIABLE_BLOCKS.global.getter,
            STATIC_VARIABLE_BLOCKS.lexical.getter);
        chai.assert.equal(
            STATIC_VARIABLE_BLOCKS.global.setter,
            STATIC_VARIABLE_BLOCKS.lexical.setter);
      });

  test('uses the global declaration selected type while editing', function() {
    const fixture = createGlobalVariableFixture(this.workspace, 'int');

    chai.assert.equal(fixture.declaration.getVariableType(), 'int');
    assertUsageChecks(fixture, 'int');

    fixture.declaration.setFieldValue('boolean', 'TYPE');
    syncUsageChecks(fixture, fixture.declaration.getVariableType());

    chai.assert.equal(fixture.declaration.getVariableType(), 'boolean');
    assertUsageChecks(fixture, 'boolean');
  });

  test('uses the simple local declaration selected type while editing',
      function() {
        const fixture = createSimpleLocalVariableFixture(this.workspace, 'float');

        chai.assert.equal(fixture.declaration.getVariableType(), 'float');
        assertUsageChecks(fixture, 'float');

        fixture.declaration.setFieldValue('boolean', 'TYPE');
        syncUsageChecks(fixture, fixture.declaration.getVariableType());

        chai.assert.equal(fixture.declaration.getVariableType(), 'boolean');
        assertUsageChecks(fixture, 'boolean');
      });

  test('uses serialized global field type data after workspace reload',
      function() {
        createGlobalVariableFixture(this.workspace, 'float');
        const xmlText = serializeWorkspace(this.workspace);
        assertSerializedFieldType(xmlText, 'globalDecl', 'TYPE', 'float');

        const reloadedWorkspace = reloadWorkspaceFromXml(xmlText);
        const fixture = {
          declaration: reloadedWorkspace.getBlockById('globalDecl'),
          getter: reloadedWorkspace.getBlockById('globalGet'),
          setter: reloadedWorkspace.getBlockById('globalSet'),
        };

        chai.assert.equal(fixture.declaration.getVariableType(), 'float');
        assertUsageChecks(fixture, 'float');
      });

  test('uses serialized global array field type data after workspace reload',
      function() {
        createGlobalVariableFixture(this.workspace, 'float', {
          declarationType: 'global_declaration_array',
          dimension: '2',
          declId: 'globalArrayDecl',
          getId: 'globalArrayGet',
          setId: 'globalArraySet',
        });
        const xmlText = serializeWorkspace(this.workspace);
        assertSerializedFieldType(xmlText, 'globalArrayDecl', 'DIMENSION', '2');
        assertSerializedFieldType(xmlText, 'globalArrayDecl', 'TYPE', 'float');

        const reloadedWorkspace = reloadWorkspaceFromXml(xmlText);
        const fixture = {
          declaration: reloadedWorkspace.getBlockById('globalArrayDecl'),
          getter: reloadedWorkspace.getBlockById('globalArrayGet'),
          setter: reloadedWorkspace.getBlockById('globalArraySet'),
        };

        chai.assert.equal(fixture.declaration.getVariableType(), 'float[][]');
        assertUsageChecks(fixture, 'float[][]');
      });

  test('uses serialized simple lexical field type data after workspace reload',
      function() {
        createSimpleLocalVariableFixture(this.workspace, 'String');
        const xmlText = serializeWorkspace(this.workspace);
        assertSerializedFieldType(xmlText, 'localDecl', 'TYPE', 'String');

        const reloadedWorkspace = reloadWorkspaceFromXml(xmlText);
        const fixture = {
          declaration: reloadedWorkspace.getBlockById('localDecl'),
          getter: reloadedWorkspace.getBlockById('localGet'),
          setter: reloadedWorkspace.getBlockById('localSet'),
        };

        chai.assert.equal(fixture.declaration.getVariableType(), 'String');
        assertUsageChecks(fixture, 'String');
      });

  test('uses serialized lexical statement mutation type data after reload',
      function() {
        createMutationLocalVariableFixture(this.workspace, 'boolean');
        const xmlText = serializeWorkspace(this.workspace);
        assertSerializedLocalMutationType(
            xmlText, 'mutationLocalDecl', 'boolean');

        const reloadedWorkspace = reloadWorkspaceFromXml(xmlText);
        const fixture = {
          declaration: reloadedWorkspace.getBlockById('mutationLocalDecl'),
          getter: reloadedWorkspace.getBlockById('mutationLocalGet'),
          setter: reloadedWorkspace.getBlockById('mutationLocalSet'),
        };

        chai.assert.deepEqual(fixture.declaration.getVariableTypes(), ['boolean']);
        assertUsageChecks(fixture, 'boolean');
      });

  test('uses serialized lexical expression mutation type data after reload',
      function() {
        createMutationLocalExpressionFixture(this.workspace, 'float');
        const xmlText = serializeWorkspace(this.workspace);
        assertSerializedLocalMutationType(
            xmlText, 'mutationExprDecl', 'float');

        const reloadedWorkspace = reloadWorkspaceFromXml(xmlText);
        const fixture = {
          declaration: reloadedWorkspace.getBlockById('mutationExprDecl'),
          getter: reloadedWorkspace.getBlockById('mutationExprGet'),
        };

        chai.assert.deepEqual(fixture.declaration.getVariableTypes(), ['float']);
        assertGetterOutputCheck(fixture.getter, 'float');
      });

  suite('global variable type propagation', function() {
    test('updates existing getter and setter checks after declaration type ' +
        'changes', function() {
      const fixture = createGlobalVariableFixture(this.workspace, 'int');

      fixture.declaration.setFieldValue('boolean', 'TYPE');

      chai.assert.equal(fixture.declaration.getVariableType(), 'boolean');
      assertUsageChecks(fixture, 'boolean');
    });

    test('creates new getter and setter blocks with the current declaration ' +
        'type', function() {
      const fixture = createGlobalVariableFixture(this.workspace, 'int');

      fixture.declaration.setFieldValue('boolean', 'TYPE');
      const newUsages = createGlobalVariableUsages(
          this.workspace, 'score', 'newGlobal');

      assertGetterOutputCheck(newUsages.getter, 'boolean');
      assertSetterInputCheck(newUsages.setter, 'boolean');
    });

    test('only updates usages for the matching global declaration', function() {
      const scoreFixture = createGlobalVariableFixture(this.workspace, 'int', {
        name: 'score',
        declId: 'scoreDecl',
        getId: 'scoreGet',
        setId: 'scoreSet',
      });
      const livesFixture = createGlobalVariableFixture(this.workspace, 'float', {
        name: 'lives',
        declId: 'livesDecl',
        getId: 'livesGet',
        setId: 'livesSet',
      });

      scoreFixture.declaration.setFieldValue('boolean', 'TYPE');

      assertUsageChecks(scoreFixture, 'boolean');
      assertUsageChecks(livesFixture, 'float');
    });

    test('disconnects incompatible connected setter value blocks after ' +
        'declaration type changes', function() {
      const fixture = createGlobalVariableFixture(this.workspace, 'int');
      const valueBlock = connectTypedValueToSetter(
          this.workspace, fixture.setter, 'globalIntValue', 'int');

      assertSetterValueConnected(fixture.setter, valueBlock);

      fixture.declaration.setFieldValue('boolean', 'TYPE');

      assertSetterInputCheck(fixture.setter, 'boolean');
      assertSetterValueDisconnected(
          this.workspace, fixture.setter, valueBlock);
    });

    test('keeps compatible connected setter value blocks after declaration ' +
        'type changes', function() {
      const fixture = createGlobalVariableFixture(this.workspace, 'int');
      const valueBlock = connectTypedValueToSetter(
          this.workspace, fixture.setter, 'globalIntOrBoolValue',
          ['int', 'boolean']);

      assertSetterValueConnected(fixture.setter, valueBlock);

      fixture.declaration.setFieldValue('boolean', 'TYPE');

      assertSetterInputCheck(fixture.setter, 'boolean');
      assertSetterValueConnected(fixture.setter, valueBlock);
    });
  });

  suite('lexical variable type propagation', function() {
    test('updates existing getter and setter checks after declaration type ' +
        'changes', function() {
      const fixture = createSimpleLocalVariableFixture(this.workspace, 'int');

      fixture.declaration.setFieldValue('boolean', 'TYPE');

      chai.assert.equal(fixture.declaration.getVariableType(), 'boolean');
      assertUsageChecks(fixture, 'boolean');
    });

    test('creates new getter and setter blocks with the current declaration ' +
        'type', function() {
      const fixture = createSimpleLocalVariableFixture(this.workspace, 'int');

      fixture.declaration.setFieldValue('boolean', 'TYPE');
      const newUsages = createSimpleLocalVariableUsages(
          this.workspace, fixture.declaration, 'item', 'newLocal');

      assertGetterOutputCheck(newUsages.getter, 'boolean');
      assertSetterInputCheck(newUsages.setter, 'boolean');
    });

    test('only updates usages in the declaration lexical scope', function() {
      const firstFixture = createSimpleLocalVariableFixture(
          this.workspace, 'int', {
            name: 'item',
            declId: 'firstLocalDecl',
            getId: 'firstLocalGet',
            setId: 'firstLocalSet',
          });
      const secondFixture = createSimpleLocalVariableFixture(
          this.workspace, 'float', {
            name: 'item',
            declId: 'secondLocalDecl',
            getId: 'secondLocalGet',
            setId: 'secondLocalSet',
          });

      firstFixture.declaration.setFieldValue('boolean', 'TYPE');

      assertUsageChecks(firstFixture, 'boolean');
      assertUsageChecks(secondFixture, 'float');
    });

    test('disconnects incompatible connected setter value blocks after ' +
        'declaration type changes', function() {
      const fixture = createSimpleLocalVariableFixture(this.workspace, 'int');
      const valueBlock = connectTypedValueToSetter(
          this.workspace, fixture.setter, 'localIntValue', 'int');

      assertSetterValueConnected(fixture.setter, valueBlock);

      fixture.declaration.setFieldValue('boolean', 'TYPE');

      assertSetterInputCheck(fixture.setter, 'boolean');
      assertSetterValueDisconnected(
          this.workspace, fixture.setter, valueBlock);
    });

    test('keeps compatible connected setter value blocks after declaration ' +
        'type changes', function() {
      const fixture = createSimpleLocalVariableFixture(this.workspace, 'int');
      const valueBlock = connectTypedValueToSetter(
          this.workspace, fixture.setter, 'localIntOrBoolValue',
          ['int', 'boolean']);

      assertSetterValueConnected(fixture.setter, valueBlock);

      fixture.declaration.setFieldValue('boolean', 'TYPE');

      assertSetterInputCheck(fixture.setter, 'boolean');
      assertSetterValueConnected(fixture.setter, valueBlock);
    });
  });

  suite('toolbox and flyout regeneration after reload', function() {
    test('creates global toolbox and declaration flydown usages with the ' +
        'restored type', function() {
      createGlobalVariableFixture(this.workspace, 'float');
      const reloadedWorkspace = reloadWorkspaceFromXml(
          serializeWorkspace(this.workspace));
      const declaration = reloadedWorkspace.getBlockById('globalDecl');

      const toolboxUsages = createToolboxVariableUsages(
          reloadedWorkspace, 'global score', 'toolboxGlobal');
      assertUsageChecks(toolboxUsages, 'float');

      const flydownXml = declaration.getField('NAME').flydownBlocksXML_();
      assertFlydownXmlIncludesType(flydownXml, 'float');
      const flydownUsages = loadGeneratedGetterSetterXml(
          reloadedWorkspace, flydownXml, 'flydownGlobal');
      assertUsageChecks(flydownUsages, 'float');
    });

    test('regenerates global toolbox and declaration flydown usages after a ' +
        'post-reload type change', function() {
      createGlobalVariableFixture(this.workspace, 'int');
      const reloadedWorkspace = reloadWorkspaceFromXml(
          serializeWorkspace(this.workspace));
      const declaration = reloadedWorkspace.getBlockById('globalDecl');

      declaration.setFieldValue('boolean', 'TYPE');

      const toolboxUsages = createToolboxVariableUsages(
          reloadedWorkspace, 'global score', 'toolboxChangedGlobal');
      assertUsageChecks(toolboxUsages, 'boolean');

      const flydownXml = declaration.getField('NAME').flydownBlocksXML_();
      assertFlydownXmlIncludesType(flydownXml, 'boolean');
      const flydownUsages = loadGeneratedGetterSetterXml(
          reloadedWorkspace, flydownXml, 'flydownChangedGlobal');
      assertUsageChecks(flydownUsages, 'boolean');
    });

    test('creates local declaration flydown usages with the restored type',
        function() {
          createSimpleLocalVariableFixture(this.workspace, 'String');
          const reloadedWorkspace = reloadWorkspaceFromXml(
              serializeWorkspace(this.workspace));
          const declaration = reloadedWorkspace.getBlockById('localDecl');

          const flydownXml = declaration.getField('VAR').flydownBlocksXML_();
          assertFlydownXmlIncludesType(flydownXml, 'String');
          const flydownUsages = loadGeneratedGetterSetterXml(
              reloadedWorkspace, flydownXml, 'flydownLocal');

          assertUsageChecks(flydownUsages, 'String');
        });

    test('regenerates local declaration flydown usages after a post-reload ' +
        'type change', function() {
      createSimpleLocalVariableFixture(this.workspace, 'int');
      const reloadedWorkspace = reloadWorkspaceFromXml(
          serializeWorkspace(this.workspace));
      const declaration = reloadedWorkspace.getBlockById('localDecl');

      declaration.setFieldValue('boolean', 'TYPE');

      const flydownXml = declaration.getField('VAR').flydownBlocksXML_();
      assertFlydownXmlIncludesType(flydownXml, 'boolean');
      const flydownUsages = loadGeneratedGetterSetterXml(
          reloadedWorkspace, flydownXml, 'flydownChangedLocal');

      assertUsageChecks(flydownUsages, 'boolean');
    });
  });
});
