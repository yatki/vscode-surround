import { workspace, window, Uri, env } from "vscode";
import {
  ISurroundConfig,
  ISurroundConfigFile,
  ISurroundConfigItem,
  ISurroundSnippet,
  IResolvedSnippet,
  SnippetSource,
  isSnippetGroup,
} from "./types";
import { builtinSnippets } from "./defaults";

/** Get the global config directory URI */
export function getGlobalConfigDirUri(): Uri | undefined {
  // Global config dir requires a local file system (not available in web)
  if (env.uiKind === 2 /* UIKind.Web */) {
    return undefined;
  }

  const configured = workspace
    .getConfiguration("surround")
    .get<string>("globalConfigDir");

  if (configured) {
    if (configured.startsWith("~")) {
      const homeDir = process.env.HOME || process.env.USERPROFILE || "";
      return Uri.file(homeDir + configured.slice(1));
    }
    return Uri.file(configured);
  }

  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  return Uri.joinPath(Uri.file(homeDir), ".vscode-surround");
}

/** Get the project config directory URI, if a workspace is open */
export function getProjectConfigDirUri(): Uri | undefined {
  const workspaceUri = workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceUri) {
    return undefined;
  }
  return Uri.joinPath(workspaceUri, ".vscode-surround");
}

/** Flatten config items (groups + standalone snippets) into resolved snippets */
export function flattenItems(
  items: ISurroundConfigItem[],
  source: SnippetSource
): IResolvedSnippet[] {
  const result: IResolvedSnippet[] = [];

  for (const item of items) {
    if (isSnippetGroup(item)) {
      for (const snippet of item.snippets) {
        result.push({
          ...snippet,
          languageIds: item.languages,
          _source: source,
        });
      }
    } else {
      result.push({
        ...(item as ISurroundSnippet),
        _source: source,
      });
    }
  }

  return result;
}

/** Read and parse all JSON config files from a directory */
async function readConfigDirUri(
  dirUri: Uri,
  source: SnippetSource
): Promise<IResolvedSnippet[]> {
  let entries: [string, number][];

  try {
    entries = await workspace.fs.readDirectory(dirUri);
  } catch {
    // Directory doesn't exist yet — that's fine
    return [];
  }

  const snippets: IResolvedSnippet[] = [];
  const decoder = new TextDecoder("utf-8");

  for (const [name] of entries) {
    if (!name.endsWith(".json")) {
      continue;
    }

    const fileUri = Uri.joinPath(dirUri, name);
    try {
      const content = await workspace.fs.readFile(fileUri);
      const text = decoder.decode(content);
      const config: ISurroundConfigFile = JSON.parse(text);

      if (!config.items || !Array.isArray(config.items)) {
        window.showWarningMessage(
          `Surround: Invalid config file "${name}" — missing "items" array.`
        );
        continue;
      }

      snippets.push(...flattenItems(config.items, source));
    } catch (err) {
      window.showWarningMessage(
        `Surround: Failed to parse config file "${name}": ${err}`
      );
    }
  }

  return snippets;
}

/** Transform legacy surround.custom entries into ISurroundConfigItem[] */
export function transformCustomToItems(
  custom: Record<string, ISurroundSnippet>
): ISurroundConfigItem[] {
  const items: ISurroundConfigItem[] = [];
  for (const [key, value] of Object.entries(custom)) {
    if (typeof value === "object" && value.label) {
      items.push({
        ...value,
        commandName: value.commandName || key,
      });
    }
  }
  return items;
}

/** Check if user has legacy surround.custom entries that need migration */
export function hasLegacyCustomConfig(): boolean {
  const config = workspace.getConfiguration("surround");
  const custom = config.get<Record<string, ISurroundSnippet>>("custom", {}) || {};
  return Object.keys(custom).length > 0;
}

/** Load snippets defined in settings.json (surround.items, surround.custom, surround.with.*) */
function loadSettingsSnippets(): IResolvedSnippet[] {
  const config = workspace.getConfiguration("surround");
  const snippets: IResolvedSnippet[] = [];

  // Load surround.with.* settings (legacy keybinding-based)
  const withConfig = config.get<Record<string, ISurroundSnippet>>("with", {}) || {};
  for (const [key, value] of Object.entries(withConfig)) {
    if (typeof value === "object" && value.label) {
      snippets.push({
        ...value,
        commandName: value.commandName || key,
        _source: "settings",
        _key: key,
      });
    }
  }

  // Load surround.items (new array-based format, same as config files)
  const items = config.get<ISurroundConfigItem[]>("items", []) || [];
  if (items.length > 0) {
    snippets.push(...flattenItems(items, "settings"));
  }

  // Load surround.custom (deprecated — silently transform to items format)
  const custom = config.get<Record<string, ISurroundSnippet>>("custom", {}) || {};
  if (Object.keys(custom).length > 0) {
    const transformed = transformCustomToItems(custom);
    snippets.push(...flattenItems(transformed, "settings"));
  }

  return snippets;
}

/** Load all snippets from all layers, merged by label (later wins) */
export async function loadAllSnippets(): Promise<ISurroundConfig> {
  const config = workspace.getConfiguration("surround");
  const showOnlyUserDefined = config.get<boolean>(
    "showOnlyUserDefinedSnippets",
    false
  );

  const result: ISurroundConfig = {};

  // Layer 1: Built-in defaults
  if (!showOnlyUserDefined) {
    for (const snippet of Object.values(builtinSnippets)) {
      result[snippet.label] = { ...snippet };
    }
  }

  // Layer 2: Global config files
  const globalDirUri = getGlobalConfigDirUri();
  if (globalDirUri) {
    const globalSnippets = await readConfigDirUri(globalDirUri, "global");
    for (const snippet of globalSnippets) {
      result[snippet.label] = snippet;
    }
  }

  // Layer 3: Project config files
  const projectDirUri = getProjectConfigDirUri();
  if (projectDirUri) {
    const projectSnippets = await readConfigDirUri(projectDirUri, "project");
    for (const snippet of projectSnippets) {
      result[snippet.label] = snippet;
    }
  }

  // Layer 4: settings.json
  const settingsSnippets = loadSettingsSnippets();
  for (const snippet of settingsSnippets) {
    result[snippet.label] = snippet;
  }

  return result;
}
