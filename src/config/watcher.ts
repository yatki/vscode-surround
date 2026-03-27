import {
  workspace,
  Disposable,
  Uri,
  RelativePattern,
  FileSystemWatcher,
} from "vscode";

/**
 * Creates file system watchers for config directories.
 * Calls `onConfigChanged` (debounced) when any .json file changes.
 */
export function createConfigWatchers(
  globalDirUri: Uri | undefined,
  projectDirUri: Uri | undefined,
  onConfigChanged: () => void
): Disposable[] {
  const disposables: Disposable[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function debouncedReload() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(onConfigChanged, 300);
  }

  function watchDir(dirUri: Uri): FileSystemWatcher {
    const pattern = new RelativePattern(dirUri, "*.json");
    const watcher = workspace.createFileSystemWatcher(pattern);
    watcher.onDidCreate(debouncedReload);
    watcher.onDidChange(debouncedReload);
    watcher.onDidDelete(debouncedReload);
    return watcher;
  }

  // Watch global config directory
  if (globalDirUri) {
    disposables.push(watchDir(globalDirUri));
  }

  // Watch project config directory
  if (projectDirUri) {
    disposables.push(watchDir(projectDirUri));
  }

  return disposables;
}
