/** A single snippet definition */
export interface ISurroundSnippet {
  label: string;
  description?: string;
  detail?: string;
  snippet: string;
  disabled?: boolean;
  languageIds?: string[];
  /** When set, registers command `surround.with.<commandName>` for keybinding support */
  commandName?: string;
}

/** A group of snippets scoped to specific languages */
export interface ISnippetGroup {
  languages?: string[];
  snippets: ISurroundSnippet[];
}

/** Config file item: either a snippet group or a standalone snippet */
export type ISurroundConfigItem = ISnippetGroup | ISurroundSnippet;

/** Root structure of a .vscode-surround config JSON file */
export interface ISurroundConfigFile {
  items: ISurroundConfigItem[];
}

/** Source layer for precedence tracking */
export type SnippetSource = "builtin" | "global" | "project" | "settings";

/** A resolved snippet with source and original key metadata */
export interface IResolvedSnippet extends ISurroundSnippet {
  _source: SnippetSource;
  /** Original config key for backward-compatible command IDs */
  _key?: string;
}

/** The merged config: keyed by label */
export interface ISurroundConfig {
  [label: string]: IResolvedSnippet;
}

/** Type guard: checks if a config item is a snippet group */
export function isSnippetGroup(
  item: ISurroundConfigItem
): item is ISnippetGroup {
  return "snippets" in item && Array.isArray((item as ISnippetGroup).snippets);
}
