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

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  let config = workspace.getConfiguration("surround");
  let snippets = config.get("snippets", []);

  function makeQuickPick() {
    const quickPicks: QuickPickItem[] = [];
    if (snippets && snippets.length) {
      snippets.forEach(snippet => {
        const { label, description } = snippet;
        quickPicks.push({
          label,
          description
        });
      });
    }
    return quickPicks;
  }

  function applyQuickPick(item: QuickPickItem) {
    let activeEditor;
    if ((activeEditor = window.activeTextEditor)) {
      // Don't run if no active text editor instance available
      let snippet = snippets.find(s => item.label === s.label);
      activeEditor.insertSnippet(new SnippetString(snippet.snippet));
    }
  }

  let disposable = commands.registerCommand("surround.with", () => {
    window.showQuickPick(makeQuickPick()).then(item => {
      applyQuickPick(item);
    });
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
