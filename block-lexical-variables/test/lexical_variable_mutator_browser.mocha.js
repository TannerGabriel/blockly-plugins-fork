/**
 * @license
 * @fileoverview Browser workflow tests for lexical local declaration mutators.
 */

import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
import {JSDOM} from 'jsdom';

import '../src/msg.js';
import '../src/utilities.js';
import '../src/workspace.js';
import '../src/fields/flydown.js';
import '../src/fields/field_flydown.js';
import '../src/fields/field_parameter_flydown.js';
import '../src/blocks/lexical-variables.js';

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

function installDom() {
  const dom = new JSDOM(
      '<!DOCTYPE html><html><body><div id="blocklyDiv"></div></body></html>',
      {pretendToBeVisual: true},
  );
  const window = dom.window;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  globalThis.Element = window.Element;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.SVGElement = window.SVGElement;
  globalThis.SVGSVGElement = window.SVGSVGElement;
  globalThis.DOMParser = window.DOMParser;
  globalThis.XMLSerializer = window.XMLSerializer;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: window.navigator,
  });

  window.HTMLCanvasElement.prototype.getContext = function() {
    return {
      measureText: function(text) {
        return {width: String(text || '').length * 8};
      },
    };
  };

  if (!window.SVGElement.prototype.getBBox) {
    window.SVGElement.prototype.getBBox = function() {
      return {x: 0, y: 0, width: 120, height: 32};
    };
  }
  if (!window.SVGElement.prototype.getComputedTextLength) {
    window.SVGElement.prototype.getComputedTextLength = function() {
      return (this.textContent || '').length * 8;
    };
  }

  const blocklyDiv = window.document.getElementById('blocklyDiv');
  blocklyDiv.style.width = '800px';
  blocklyDiv.style.height = '600px';

  return {dom, blocklyDiv};
}

function uninstallDom(dom) {
  if (!dom) {
    return;
  }
  dom.window.close();
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.Node;
  delete globalThis.Element;
  delete globalThis.HTMLElement;
  delete globalThis.SVGElement;
  delete globalThis.SVGSVGElement;
  delete globalThis.DOMParser;
  delete globalThis.XMLSerializer;
  delete globalThis.navigator;
}

function createBrowserWorkspace(blocklyDiv) {
  const workspace = Blockly.inject(blocklyDiv, {
    collapse: true,
    renderer: 'geras',
  });
  Blockly.common.setMainWorkspace(workspace);
  return workspace;
}

function createRenderedLocalDeclaration(workspace, names, types) {
  const block = workspace.newBlock('local_declaration_statement');
  block.initSvg();
  block.render();
  block.updateDeclarationInputs_(names, types);
  block.render();
  return block;
}

function getMutatorIcon(block) {
  return block.getIcon(Blockly.icons.MutatorIcon.TYPE);
}

function getMutatorContainer(mutatorWorkspace) {
  return mutatorWorkspace.getTopBlocks(false).find(function(block) {
    return block.type === 'local_mutatorcontainer';
  });
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

function appendMutatorArg(workspace, containerBlock, name, type) {
  const arg = workspace.newBlock('local_mutatorarg');
  arg.initSvg();
  arg.render();
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

function waitForMutatorSync() {
  if (Blockly.Events && typeof Blockly.Events.fireNow === 'function') {
    Blockly.Events.fireNow();
  }
  return new Promise(function(resolve) {
    setTimeout(function() {
      if (Blockly.Events && typeof Blockly.Events.fireNow === 'function') {
        Blockly.Events.fireNow();
      }
      resolve();
    }, 0);
  });
}

function removeMutatorArg(containerBlock, index) {
  let arg = containerBlock.getInputTargetBlock('STACK');
  for (let i = 0; arg && i < index; i++) {
    arg = arg.nextConnection && arg.nextConnection.targetBlock();
  }
  chai.assert.isOk(arg, 'Expected mutator arg at index ' + index);
  arg.dispose(true);
}

async function openMutator(block) {
  const mutator = getMutatorIcon(block);
  chai.assert.isOk(mutator, 'Expected block to have a mutator icon');

  await mutator.setBubbleVisible(true);
  await waitForMutatorSync();

  chai.assert.isTrue(mutator.bubbleIsVisible());
  const mutatorWorkspace = mutator.getWorkspace();
  chai.assert.isOk(mutatorWorkspace);
  const container = getMutatorContainer(mutatorWorkspace);
  chai.assert.isOk(container);
  return {mutator, mutatorWorkspace, container};
}

async function closeMutator(mutator) {
  await waitForMutatorSync();
  await mutator.setBubbleVisible(false);
  await waitForMutatorSync();
  chai.assert.isFalse(mutator.bubbleIsVisible());
}

suite('LexicalVariableMutatorBrowser', function() {
  setup(function() {
    Blockly.setLocale(En);
    enableStaticTypes();
    const installed = installDom();
    this.dom = installed.dom;
    this.workspace = createBrowserWorkspace(installed.blocklyDiv);
  });

  teardown(function() {
    if (this.workspace) {
      this.workspace.dispose();
    }
    delete this.workspace;
    uninstallDom(this.dom);
    delete this.dom;
    disableStaticTypes();
  });

  test('opens the local declaration mutator without errors', async function() {
    const block = createRenderedLocalDeclaration(
        this.workspace, ['alpha'], ['int']);
    const opened = await openMutator(block);

    chai.assert.deepEqual(collectMutatorArgNames(opened.container), ['alpha']);

    await closeMutator(opened.mutator);
  });

  test('adds, removes, and persists valid variables through the mutator',
      async function() {
        const block = createRenderedLocalDeclaration(
            this.workspace, ['alpha'], ['int']);
        const opened = await openMutator(block);

        appendMutatorArg(opened.mutatorWorkspace, opened.container,
            'beta', 'float');
        appendMutatorArg(opened.mutatorWorkspace, opened.container,
            'gamma', 'boolean');
        await waitForMutatorSync();

        chai.assert.deepEqual(
            collectMutatorArgNames(opened.container),
            ['alpha', 'beta', 'gamma']);
        chai.assert.deepEqual(
            block.declaredNames(), ['alpha', 'beta', 'gamma']);

        removeMutatorArg(opened.container, 2);
        await waitForMutatorSync();
        const betaArg =
            opened.container.getInputTargetBlock('STACK').nextConnection
                .targetBlock();
        betaArg.setFieldValue('boolean', 'TYPE');
        await waitForMutatorSync();
        betaArg.setFieldValue('float', 'TYPE');
        await waitForMutatorSync();

        chai.assert.deepEqual(
            collectMutatorArgNames(opened.container), ['alpha', 'beta']);
        chai.assert.deepEqual(block.declaredNames(), ['alpha', 'beta']);

        await closeMutator(opened.mutator);
        const reopened = await openMutator(block);

        chai.assert.deepEqual(
            collectMutatorArgNames(reopened.container), ['alpha', 'beta']);
        chai.assert.deepEqual(block.declaredNames(), ['alpha', 'beta']);
        chai.assert.deepEqual(block.getVariableTypes(), ['int', 'float']);
        chai.assert.deepEqual(
            block.getInput('DECL0').connection.getCheck(), ['int']);
        chai.assert.deepEqual(
            block.getInput('DECL1').connection.getCheck(), ['float']);

        await closeMutator(reopened.mutator);
      });

  test('rejects duplicate names introduced through browser mutator editing',
      async function() {
        const block = createRenderedLocalDeclaration(
            this.workspace, ['alpha'], ['int']);
        const opened = await openMutator(block);

        appendMutatorArg(opened.mutatorWorkspace, opened.container,
            'alpha', 'float');
        await waitForMutatorSync();

        chai.assert.deepEqual(block.declaredNames(), ['alpha', 'alpha2']);
        chai.assert.lengthOf(new Set(block.declaredNames()), 2);

        await closeMutator(opened.mutator);
        const reopened = await openMutator(block);

        chai.assert.deepEqual(
            collectMutatorArgNames(reopened.container), ['alpha', 'alpha2']);
        chai.assert.deepEqual(block.declaredNames(), ['alpha', 'alpha2']);

        await closeMutator(reopened.mutator);
      });
});
