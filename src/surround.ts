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
  Selection,
  Position,
} from "vscode";
import { IResolvedSnippet, ISurroundConfig } from "./config/types";
import { loadAllSnippets, getGlobalConfigDirUri, getProjectConfigDirUri, hasLegacyCustomConfig } from "./config/loader";
import { createConfigWatchers } from "./config/watcher";
import { exportSettingsToFile } from "./config/exportSettings";
import { showWhatsNewPage } from "./whatsNew";

function getLanguageId(): string | undefined {
  let editor = window.activeTextEditor;
  if (editor === undefined) {
    return undefined;
  }
  return editor.document.languageId;
}

function filterSurroundItems(items: IResolvedSnippet[], languageId?: string) {
  if (languageId === undefined) {
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

function getEnabledSurroundItems(surroundConfig: ISurroundConfig): IResolvedSnippet[] {
  return Object.values(surroundConfig).filter((item) => !item.disabled);
}

function trimSelection(selection: Selection): Selection | undefined {
  let activeEditor = window.activeTextEditor;
  if (activeEditor && selection) {
    const startLine = selection.start.line;
    const endLine = selection.end.line;

    let startPosition: Position | undefined = undefined;
    let endPosition: Position | undefined = undefined;

    for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
      const line = activeEditor.document.lineAt(lineNo);
      if (line.isEmptyOrWhitespace) {
        continue;
      }

      if (
        lineNo === startLine &&
        !line.text.slice(selection.start.character).trim()
      ) {
        continue;
      }

      if (
        lineNo > startLine &&
        lineNo === endLine &&
        selection.end.character < line.firstNonWhitespaceCharacterIndex
      ) {
        continue;
      }

      if (!startPosition) {
        let startCharacter = line.firstNonWhitespaceCharacterIndex;

        if (lineNo === startLine) {
          startCharacter = Math.max(startCharacter, selection.start.character);
        }

        startPosition = new Position(lineNo, startCharacter);
      }

      let endCharacter =
        line.firstNonWhitespaceCharacterIndex + line.text.trim().length;

      if (lineNo === endLine) {
        endCharacter = Math.min(endCharacter, selection.end.character);
      }

      endPosition = new Position(lineNo, endCharacter);
    }

    if (startPosition && endPosition) {
      return new Selection(startPosition, endPosition);
    }
  }

  return undefined;
}

function trimSelections(): void {
  let activeEditor = window.activeTextEditor;
  if (!activeEditor || !activeEditor.selections) {
    return;
  }

  const selections: Selection[] = activeEditor.selections.map((selection) => {
    const { start, end } = selection;

    if (start.line === end.line && start.character === end.character) {
      return selection;
    }

    const trimmedSelection = trimSelection(selection);
    return trimmedSelection || selection;
  });

  activeEditor.selections = selections;
}

function applyQuickPick(item: QuickPickItem, surroundItems: IResolvedSnippet[]) {
  const activeEditor = window.activeTextEditor;

  if (!activeEditor || !item) { return; }

  const surroundItem = surroundItems.find((s) => item.label === s.label);
  if (!surroundItem) { return; }

  try {
    trimSelections();
    activeEditor.insertSnippet(new SnippetString(surroundItem.snippet));
  } catch (err) {
    window.showErrorMessage(
      "Could not apply surround snippet: " + surroundItem.label,
      String(err)
    );
  }
}

function applySurroundItem(label: string, surroundConfig: ISurroundConfig) {
  if (window.activeTextEditor && surroundConfig[label]) {
    const surroundItem = surroundConfig[label];
    window.activeTextEditor.insertSnippet(
      new SnippetString(surroundItem.snippet)
    );
  }
}

async function registerCommands(
  context: ExtensionContext,
  surroundConfig: ISurroundConfig
) {
  const registeredCommands = await commands.getCommands();
  for (const snippet of Object.values(surroundConfig)) {
    const cmdName = snippet.commandName || snippet._key;
    if (!cmdName) {
      continue;
    }
    const commandText = `surround.with.${cmdName}`;
    if (!registeredCommands.includes(commandText)) {
      context.subscriptions.push(
        commands.registerCommand(commandText, () => {
          applySurroundItem(snippet.label, surroundConfig);
        })
      );
    }
  }
}

const SURROUND_LAST_VERSION_KEY = "yatki.vscode-surround:last-version";
const PENDING_FOCUS = "yatki.vscode-surround:pending-focus";

async function showWelcomeOrWhatsNew(
  context: ExtensionContext,
  version: string,
  previousVersion: string | undefined
) {
  if (previousVersion !== version) {
    if (window.state.focused) {
      void context.globalState.update(PENDING_FOCUS, undefined);
      void context.globalState.update(SURROUND_LAST_VERSION_KEY, version);
      if (previousVersion) {
        showWhatsNewPage(context);
      }
      void showMessage(context, version, previousVersion);
    } else {
      await context.globalState.update(PENDING_FOCUS, true);
      const disposable = window.onDidChangeWindowState((e) => {
        if (!e.focused) {
          return;
        }

        disposable.dispose();

        if (context.globalState.get(PENDING_FOCUS) === true) {
          void context.globalState.update(PENDING_FOCUS, undefined);
          void context.globalState.update(SURROUND_LAST_VERSION_KEY, version);
          if (previousVersion) {
            showWhatsNewPage(context);
          }
          void showMessage(context, version, previousVersion);
        }
      });
      context.subscriptions.push(disposable);
    }
  }
}

async function showMessage(
  context: ExtensionContext,
  version: string,
  previousVersion?: string
) {
  const whatsNew = { title: "What's New" };
  const giveAStar = { title: "★ Give a star" };
  const sponsor = { title: "❤ Sponsor" };
  const actions: MessageItem[] = [giveAStar, sponsor];

  const showUpdateNotifications = !!workspace
    .getConfiguration("surround")
    .get("showUpdateNotifications");

  if (previousVersion) {
    if (!showUpdateNotifications) {
      return;
    }
    actions.unshift(whatsNew);
  }

  const message = previousVersion
    ? `Surround has been updated to v${version}! — check out what's new!`
    : "Thanks for using Surround — have a beautiful day! 🖖🏻 Cheers,";

  const result = await window.showInformationMessage(message, ...actions);

  switch (result) {
    case whatsNew:
      showWhatsNewPage(context);
      break;
    case giveAStar:
      await env.openExternal(Uri.parse("https://github.com/yatki/vscode-surround"));
      break;
    case sponsor:
      await env.openExternal(Uri.parse("https://github.com/sponsors/yatki"));
      break;
    default:
      break;
  }
}

const MIGRATION_DISMISSED_KEY = "yatki.vscode-surround:migration-dismissed";

async function showMigrationToast(context: ExtensionContext): Promise<void> {
  if (!hasLegacyCustomConfig()) {
    return;
  }

  const dismissed = context.globalState.get<boolean>(MIGRATION_DISMISSED_KEY);
  if (dismissed) {
    return;
  }

  const showSettings: MessageItem = { title: "Show Settings" };
  const preferFiles: MessageItem = { title: "Prefer Config Files" };

  const result = await window.showInformationMessage(
    "Surround: \"surround.custom\" is deprecated. Your snippets still work, but consider migrating to \"surround.items\" or config files.",
    showSettings,
    preferFiles
  );

  if (result === showSettings) {
    await commands.executeCommand(
      "workbench.action.openSettings",
      "surround.items"
    );
  } else if (result === preferFiles) {
    await commands.executeCommand("surround.exportSettings");
  }

  // Dismiss after any interaction (including closing the toast)
  await context.globalState.update(MIGRATION_DISMISSED_KEY, true);
}

export function activate(context: ExtensionContext) {
  let surroundItems: IResolvedSnippet[] = [];
  let showRecentlyUsedFirst = true;
  let surroundConfig: ISurroundConfig;

  const previousVersion = context.globalState.get<string>(
    SURROUND_LAST_VERSION_KEY
  );
  const surroundExt = extensions.getExtension("yatki.vscode-surround")!;
  const surroundVersion = surroundExt.packageJSON.version;

  async function update() {
    surroundConfig = await loadAllSnippets();

    showRecentlyUsedFirst = !!workspace
      .getConfiguration("surround")
      .get("showRecentlyUsedFirst");
    surroundItems = getEnabledSurroundItems(surroundConfig);

    await registerCommands(context, surroundConfig);
  }

  // Watch for settings.json changes (behavior settings + snippet definitions)
  context.subscriptions.push(
    workspace.onDidChangeConfiguration(() => {
      void update();
    })
  );

  // Watch for config file changes
  const globalDirUri = getGlobalConfigDirUri();
  const projectDirUri = getProjectConfigDirUri();
  const watchers = createConfigWatchers(globalDirUri, projectDirUri, () => {
    void update();
  });
  for (const watcher of watchers) {
    context.subscriptions.push(watcher);
  }

  // Register export settings command
  context.subscriptions.push(
    commands.registerCommand("surround.exportSettings", exportSettingsToFile)
  );

  // Register What's New command
  context.subscriptions.push(
    commands.registerCommand("surround.whatsNew", () => {
      showWhatsNewPage(context);
    })
  );

  void update();
  void showWelcomeOrWhatsNew(context, surroundVersion, previousVersion);
  void showMigrationToast(context);

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
        (i) => i.label !== item.label || i.description !== item.description
      );
      surroundItems.unshift(selectedSurroundItem);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
