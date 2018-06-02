"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  workspace,
  ExtensionContext,
  commands,
  window,
  QuickPickItem,
  SnippetString
} from "vscode";

interface ISurroundItem {
  label: string;
  description?: string;
  detail?: string;
  snippet: string;
  disabled: boolean;
}

interface ISurroundConfig {
  [key: string]: ISurroundItem;
}

function getSurroundConfig(): ISurroundConfig {
  let config = workspace.getConfiguration("surround");
  const items = <ISurroundConfig>config.get("with", {});
  const custom = <ISurroundConfig>config.get("custom", {});
  return Object.assign(items, custom);
}

function getEnabledSurroundItems() {
  const items: ISurroundItem[] = [];
  const surroundConfig = getSurroundConfig();
  console.log("surroundConfig", surroundConfig);
  Object.keys(surroundConfig).forEach(surroundItemKey => {
    const surroundItem: ISurroundItem = surroundConfig[surroundItemKey];
    if (!surroundItem.disabled) {
      items.push(surroundItem);
    }
  });
  return items;
}

function getQuickPickItems(surroundItems: ISurroundItem[]) {
  const items: QuickPickItem[] = [];
  surroundItems.forEach(surroundItem => {
    if (!surroundItem.disabled) {
      const { label, description } = surroundItem;
      items.push({
        label,
        description
      });
    }
  });
  return items;
}

function applyQuickPick(item: QuickPickItem, surroundItems: ISurroundItem[]) {
  let activeEditor = window.activeTextEditor;
  if (activeEditor && item) {
    let surroundItem = surroundItems.find(s => item.label === s.label);
    if (surroundItem) {
      activeEditor.insertSnippet(new SnippetString(surroundItem.snippet));
    }
  }
}

function applySurroundItem(key: string) {
  const surroundConfig = getSurroundConfig();
  if (window.activeTextEditor && surroundConfig[key]) {
    const surroundItem: ISurroundItem = surroundConfig[key];
    window.activeTextEditor.insertSnippet(
      new SnippetString(surroundItem.snippet)
    );
  }
}

function registerCommands(context: ExtensionContext) {
  const surroundConfig = getSurroundConfig();
  commands.getCommands().then(cmdList => {
    Object.keys(surroundConfig).forEach(key => {
      const cmdText = `surround.with.${key}`;
      if (cmdList.indexOf(cmdText) === -1) {
        context.subscriptions.push(
          commands.registerCommand(cmdText, () => {
            applySurroundItem(key);
          })
        );
      }
    });
  });
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  window.showInformationMessage("activated!");

  let quickPickItems: QuickPickItem[];
  let surroundItems: ISurroundItem[] = [];

  function update() {
    surroundItems = getEnabledSurroundItems();
    quickPickItems = getQuickPickItems(surroundItems);
    registerCommands(context);
  }

  workspace.onDidChangeConfiguration(() => {
    window.showInformationMessage("updated!");
    update();
  });

  update();

  let disposable = commands.registerCommand("surround.with", () => {
    window.showQuickPick(quickPickItems).then(item => {
      if (item) {
        applyQuickPick(item, surroundItems);
      }
    });
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
