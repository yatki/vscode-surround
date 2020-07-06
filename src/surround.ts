"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  workspace,
  ExtensionContext,
  commands,
  window,
  QuickPickItem,
  SnippetString,
} from "vscode";

interface ISurroundItem {
  label: string;
  language?: string;
  description?: string;
  detail?: string;
  snippet: string;
  disabled?: boolean;
}

interface ISurroundConfig {
  [key: string]: ISurroundItem;
}

function getlanguageId(): string | undefined {
  let editor = window.activeTextEditor;
  if (editor === undefined) {
    return undefined;
  }
  return editor.document.languageId;
}

function filterQuickPickItems(items: ISurroundItem[], languageId: string | undefined) {
  if (languageId == undefined) {
    return items;
  }
  return items.filter((item) => {
    return item.language == languageId || item.language == undefined
  })
}

function getSurroundConfig(): ISurroundConfig {
  let config = workspace.getConfiguration("surround");
  const items = <ISurroundConfig>config.get("with", {});
  const custom = <ISurroundConfig>config.get("custom", {});
  return { ...items, ...custom };
}

function getEnabledSurroundItems() {
  const items: ISurroundItem[] = [];
  const surroundConfig = getSurroundConfig();
  Object.keys(surroundConfig).forEach(surroundItemKey => {
    const surroundItem: ISurroundItem = surroundConfig[surroundItemKey];
    if (!surroundItem.disabled) {
      items.push(surroundItem);
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
  let surroundItems: ISurroundItem[] = [];

  function update() {
    surroundItems = getEnabledSurroundItems();
    registerCommands(context);
  }

  workspace.onDidChangeConfiguration(() => {
    update();
  });

  update();

  let disposable = commands.registerCommand("surround.with", () => {
    const currentlanguageItems = filterQuickPickItems(surroundItems, getlanguageId())
    window.showQuickPick(currentlanguageItems).then(item => {
      if (item) {
        applyQuickPick(item, surroundItems);
      }
    });
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
