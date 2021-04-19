import {
  workspace,
  ExtensionContext,
  commands,
  window,
  QuickPickItem,
  SnippetString,
  extensions,
  MessageItem,
  env,
  Uri,
} from "vscode";

interface ISurroundItem {
  label: string;
  description?: string;
  detail?: string;
  snippet: string;
  disabled?: boolean;
  languageIds?: string;
}

interface ISurroundConfig {
  [key: string]: ISurroundItem;
}

function getLanguageId(): string | undefined {
  let editor = window.activeTextEditor;
  if (editor === undefined) {
    return undefined;
  }
  return editor.document.languageId;
}

function filterSurroundItems(items: ISurroundItem[], languageId?: string) {
  if (languageId == undefined) {
    return items;
  }
  return items.filter((item) => {
    if (!item.languageIds || item.languageIds.length < 1) {
      return true;
    }

    if (item.languageIds.includes(`-${languageId}`)) {
      return false;
    }

    if (
      item.languageIds.includes("*") ||
      item.languageIds.includes(languageId)
    ) {
      return true;
    }

    return false;
  });
}

function getSurroundConfig(): ISurroundConfig {
  let config = workspace.getConfiguration("surround");
  const showOnlyUserDefinedSnippets = config.get(
    "showOnlyUserDefinedSnippets",
    false
  );
  const items = showOnlyUserDefinedSnippets
    ? {}
    : <ISurroundConfig>config.get("with", {});
  const custom = <ISurroundConfig>config.get("custom", {});
  return { ...items, ...custom };
}

function getEnabledSurroundItems() {
  const items: ISurroundItem[] = [];
  const surroundConfig = getSurroundConfig();
  Object.keys(surroundConfig).forEach((surroundItemKey) => {
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
    let surroundItem = surroundItems.find((s) => item.label === s.label);
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
  commands.getCommands().then((cmdList) => {
    Object.keys(surroundConfig).forEach((key) => {
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

const SurroundLastVersionKey = "yatki.vscode-surround:last-version";
const PendingWelcomeOnFocus = "yatki.vscode-surround:pending-focus";

async function showWelcomeOrWhatsNew(
  context: ExtensionContext,
  version: string,
  previousVersion: string | undefined
) {
  if (previousVersion !== version) {
    if (window.state.focused) {
      void context.globalState.update(PendingWelcomeOnFocus, undefined);
      void context.globalState.update(SurroundLastVersionKey, version);
      void showWhatsNewMessage(version);
    } else {
      // Save pending on window getting focus
      await context.globalState.update(PendingWelcomeOnFocus, true);
      const disposable = window.onDidChangeWindowState((e) => {
        if (!e.focused) return;

        disposable.dispose();

        // If the window is now focused and we are pending the welcome, clear the pending state and show the welcome
        if (context.globalState.get(PendingWelcomeOnFocus) === true) {
          void context.globalState.update(PendingWelcomeOnFocus, undefined);
          void context.globalState.update(SurroundLastVersionKey, version);
          void showWhatsNewMessage(version);
        }
      });
      context.subscriptions.push(disposable);
    }
  }
}

async function showWhatsNewMessage(version: string) {
  const actions: MessageItem[] = [
    { title: "What's New" },
    { title: "★ Give a star" },
    { title: "❤ Sponsor" },
  ];

  const result = await window.showInformationMessage(
    `Surround has been updated to v${version} — check out what's new!`,
    ...actions
  );

  if (result != null) {
    if (result === actions[0]) {
      await env.openExternal(
        Uri.parse("https://github.com/yatki/vscode-surround/releases")
      );
    } else if (result === actions[1]) {
      await env.openExternal(
        Uri.parse("https://github.com/yatki/vscode-surround")
      );
    } else if (result === actions[1]) {
      await env.openExternal(Uri.parse("https://github.com/sponsors/yatki"));
    }
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  let surroundItems: ISurroundItem[] = [];
  let showRecentlyUsedFirst = true;

  const previousVersion = "";
  // context.globalState.get<string>(SurroundLastVersionKey);
  const surroundExt = extensions.getExtension("yatki.vscode-surround")!;
  const surroundVersion = surroundExt.packageJSON.version;

  function update() {
    showRecentlyUsedFirst = !!workspace
      .getConfiguration("surround")
      .get("showRecentlyUsedFirst");
    surroundItems = getEnabledSurroundItems();

    registerCommands(context);
  }

  workspace.onDidChangeConfiguration(() => {
    update();
  });

  update();
  showWelcomeOrWhatsNew(context, surroundVersion, previousVersion);

  let disposable = commands.registerCommand("surround.with", async () => {
    let quickPickItems = filterSurroundItems(
      surroundItems,
      getLanguageId()
    ).map(({ label, description }) => ({
      label,
      description,
    }));

    const item = await window.showQuickPick(quickPickItems, {
      placeHolder: "Type the label of the snippet",
      matchOnDescription: true,
    });

    if (!item) {
      return;
    }

    applyQuickPick(item, surroundItems);

    const selectedSurroundItem = surroundItems.find(
      (i) => i.label === item.label && i.description === item.description
    );

    if (showRecentlyUsedFirst && selectedSurroundItem) {
      surroundItems = surroundItems.filter(
        (i) => i.label !== item.label && i.description !== item.description
      );
      surroundItems.unshift(selectedSurroundItem);
    }
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
