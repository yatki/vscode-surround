import { workspace, window, Uri, QuickPickItem } from "vscode";
import { ISurroundSnippet, ISurroundConfigFile, ISurroundConfigItem } from "./types";
import { getGlobalConfigDirUri, getProjectConfigDirUri, transformCustomToItems } from "./loader";

/**
 * Build config items from settings.json snippets,
 * grouping by languageIds for efficient config groups.
 */
function buildConfigItems(
  allSnippets: { key: string; snippet: ISurroundSnippet }[]
): ISurroundConfigItem[] {
  const groups = new Map<string, { languages?: string[]; snippets: ISurroundSnippet[] }>();

  for (const { key, snippet } of allSnippets) {
    const langKey = snippet.languageIds
      ? JSON.stringify([...snippet.languageIds].sort())
      : "__all__";

    if (!groups.has(langKey)) {
      groups.set(langKey, {
        languages: snippet.languageIds,
        snippets: [],
      });
    }

    const cleanSnippet: ISurroundSnippet = {
      label: snippet.label,
      snippet: snippet.snippet,
      commandName: key,
    };
    if (snippet.description) {
      cleanSnippet.description = snippet.description;
    }
    if (snippet.detail) {
      cleanSnippet.detail = snippet.detail;
    }
    if (snippet.disabled) {
      cleanSnippet.disabled = snippet.disabled;
    }

    groups.get(langKey)!.snippets.push(cleanSnippet);
  }

  const items: ISurroundConfigItem[] = [];

  for (const [langKey, group] of groups) {
    if (langKey === "__all__" && group.snippets.length === 1) {
      items.push(group.snippets[0]);
    } else if (langKey === "__all__") {
      items.push({ snippets: group.snippets });
    } else if (group.snippets.length === 1) {
      items.push({
        ...group.snippets[0],
        languageIds: group.languages,
      });
    } else {
      items.push({
        languages: group.languages,
        snippets: group.snippets,
      });
    }
  }

  return items;
}

/** Write config file to a directory, handling overwrite confirmation and directory creation */
async function writeConfigToDir(
  dirUri: Uri,
  jsonContent: string
): Promise<boolean> {
  const outputFile = Uri.joinPath(dirUri, "default.json");
  const outputPath = outputFile.fsPath || outputFile.toString();

  // Check if file already exists
  try {
    await workspace.fs.stat(outputFile);
    const overwrite = await window.showWarningMessage(
      `Surround: "${outputPath}" already exists. Overwrite?`,
      "Yes",
      "No"
    );
    if (overwrite !== "Yes") {
      return false;
    }
  } catch {
    try {
      await workspace.fs.createDirectory(dirUri);
    } catch {
      // Directory might already exist
    }
  }

  const encoder = new TextEncoder();
  await workspace.fs.writeFile(outputFile, encoder.encode(jsonContent));

  const openFile = await window.showInformationMessage(
    `Surround: Snippets exported to ${outputPath}.`,
    "Open File"
  );

  if (openFile === "Open File") {
    const doc = await workspace.openTextDocument(outputFile);
    await window.showTextDocument(doc);
  }

  return true;
}

/**
 * Export snippets from settings.json to a file-based config.
 * Prompts user to choose between global and workspace location.
 */
export async function exportSettingsToFile(): Promise<void> {
  const config = workspace.getConfiguration("surround");
  const withConfig = config.get<Record<string, ISurroundSnippet>>("with", {}) || {};
  const custom = config.get<Record<string, ISurroundSnippet>>("custom", {}) || {};
  const itemsConfig = config.get<ISurroundConfigItem[]>("items", []) || [];

  // Collect keyed snippets from surround.with.* and surround.custom
  const allSnippets: { key: string; snippet: ISurroundSnippet }[] = [];

  for (const [key, value] of Object.entries(withConfig)) {
    if (typeof value === "object" && value.label) {
      allSnippets.push({ key, snippet: value });
    }
  }

  for (const [key, value] of Object.entries(custom)) {
    if (typeof value === "object" && value.label) {
      allSnippets.push({ key, snippet: value });
    }
  }

  // Also include surround.items (already in the right format)
  const hasKeyedSnippets = allSnippets.length > 0;
  const hasItems = itemsConfig.length > 0;

  if (!hasKeyedSnippets && !hasItems) {
    window.showInformationMessage(
      "Surround: No snippets found in settings.json to export."
    );
    return;
  }

  // Build destination options
  const globalDirUri = getGlobalConfigDirUri();
  const projectDirUri = getProjectConfigDirUri();

  const picks: (QuickPickItem & { dirUri: Uri })[] = [];

  if (globalDirUri) {
    picks.push({
      label: "Global",
      description: Uri.joinPath(globalDirUri, "default.json").fsPath,
      detail: "Available in all workspaces",
      dirUri: globalDirUri,
    });
  }

  if (projectDirUri) {
    picks.push({
      label: "Workspace",
      description: Uri.joinPath(projectDirUri, "default.json").path,
      detail: "Only available in this workspace",
      dirUri: projectDirUri,
    });
  }

  if (picks.length === 0) {
    window.showWarningMessage(
      "Surround: No export destination available. Open a workspace to export to a project config file."
    );
    return;
  }

  const selected = await window.showQuickPick(picks, {
    placeHolder: "Export snippets to...",
  });

  if (!selected) {
    return;
  }

  // Build items from keyed snippets + merge with existing surround.items
  const items = [
    ...buildConfigItems(allSnippets),
    ...itemsConfig,
  ];
  const configFile: ISurroundConfigFile = { items };
  const jsonContent = JSON.stringify(configFile, null, 2);

  await writeConfigToDir(selected.dirUri, jsonContent);
}
