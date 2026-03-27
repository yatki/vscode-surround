import { ExtensionContext, WebviewPanel, ViewColumn, window, Uri } from "vscode";

let currentPanel: WebviewPanel | undefined;

export function showWhatsNewPage(context: ExtensionContext): void {
  if (currentPanel) {
    currentPanel.reveal(ViewColumn.One);
    return;
  }

  currentPanel = window.createWebviewPanel(
    "surroundWhatsNew",
    "Surround — What's New",
    ViewColumn.One,
    { enableScripts: false }
  );

  currentPanel.webview.html = getWhatsNewHtml();

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  }, null, context.subscriptions);
}

function getWhatsNewHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Surround — What's New</title>
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      max-width: 760px;
      margin: 0 auto;
      padding: 24px 16px;
      line-height: 1.6;
    }
    h1 {
      font-size: 1.8em;
      margin-bottom: 4px;
      color: var(--vscode-foreground);
    }
    .subtitle {
      color: var(--vscode-descriptionForeground);
      font-size: 0.95em;
      margin-bottom: 32px;
    }
    h2 {
      font-size: 1.3em;
      margin-top: 32px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--vscode-widget-border, #444);
    }
    h3 {
      font-size: 1.1em;
      margin-top: 20px;
      margin-bottom: 8px;
    }
    code {
      font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
      background: var(--vscode-textCodeBlock-background, #1e1e1e);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
    }
    pre {
      background: var(--vscode-textCodeBlock-background, #1e1e1e);
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.88em;
      line-height: 1.5;
    }
    pre code {
      background: none;
      padding: 0;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.75em;
      font-weight: 600;
      text-transform: uppercase;
      margin-right: 6px;
    }
    .badge-new {
      background: var(--vscode-testing-iconPassed, #388a34);
      color: #fff;
    }
    .badge-deprecated {
      background: var(--vscode-editorWarning-foreground, #cca700);
      color: #000;
    }
    .badge-breaking {
      background: var(--vscode-editorError-foreground, #f14c4c);
      color: #fff;
    }
    .callout {
      border-left: 4px solid var(--vscode-editorWarning-foreground, #cca700);
      background: var(--vscode-textBlockQuote-background, #2a2a2a);
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
    }
    .callout-info {
      border-left-color: var(--vscode-editorInfo-foreground, #3794ff);
    }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }
    th, td {
      border: 1px solid var(--vscode-widget-border, #444);
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: var(--vscode-textCodeBlock-background, #1e1e1e);
    }
  </style>
</head>
<body>
  <h1>Surround v2.0</h1>
  <p class="subtitle">A unified configuration experience</p>

  <h2><span class="badge badge-new">New</span> <code>surround.items</code> Setting</h2>
  <p>
    You can now define custom snippets in <code>settings.json</code> using the same array format
    as <code>.vscode-surround/</code> config files. This means one schema to learn, and you can
    easily move snippets between settings and files.
  </p>

  <h3>Before (deprecated)</h3>
<pre><code>// settings.json
"surround.custom": {
  "log": {
    "label": "console.log",
    "snippet": "console.log($TM_SELECTED_TEXT)"
  },
  "await": {
    "label": "await",
    "snippet": "await ($TM_SELECTED_TEXT)"
  }
}</code></pre>

  <h3>After</h3>
<pre><code>// settings.json
"surround.items": [
  {
    "label": "console.log",
    "snippet": "console.log($TM_SELECTED_TEXT)",
    "commandName": "log"
  },
  {
    "label": "await",
    "snippet": "await ($TM_SELECTED_TEXT)",
    "commandName": "await"
  }
]</code></pre>

  <h3>With language groups</h3>
<pre><code>"surround.items": [
  {
    "languages": ["javascript", "typescript"],
    "snippets": [
      { "label": "console.log", "snippet": "console.log($TM_SELECTED_TEXT)" },
      { "label": "try/catch", "snippet": "try {\\n\\t$TM_SELECTED_TEXT\\n} catch(e) {}" }
    ]
  },
  {
    "label": "comment",
    "snippet": "/* $TM_SELECTED_TEXT */"
  }
]</code></pre>

  <h2><span class="badge badge-deprecated">Deprecated</span> <code>surround.custom</code></h2>
  <p>
    The old <code>surround.custom</code> key-value format still works — your existing snippets will
    load automatically with no changes needed. However, it is deprecated and will be removed in a
    future version.
  </p>
  <p>
    Use the <strong>Surround: Export Settings to File</strong> command to migrate your snippets
    to file-based config, or manually rewrite them using <code>surround.items</code>.
  </p>

  <h2>File-Based Configuration</h2>
  <p>Surround supports loading snippets from JSON files in two locations:</p>
  <table>
    <tr>
      <th>Location</th>
      <th>Scope</th>
      <th>Path</th>
    </tr>
    <tr>
      <td>Global</td>
      <td>All workspaces</td>
      <td><code>~/.vscode-surround/*.json</code></td>
    </tr>
    <tr>
      <td>Project</td>
      <td>Current workspace</td>
      <td><code>.vscode-surround/*.json</code></td>
    </tr>
  </table>

  <h2>Configuration Priority</h2>
  <p>When snippets share the same label, later layers override earlier ones:</p>
  <ol>
    <li>Built-in defaults (lowest)</li>
    <li>Global config files (<code>~/.vscode-surround/</code>)</li>
    <li>Project config files (<code>.vscode-surround/</code>)</li>
    <li><code>settings.json</code> — <code>surround.items</code> + <code>surround.custom</code> (highest)</li>
  </ol>

  <div class="callout">
    <strong>VS Code for the Web</strong><br>
    When using VS Code in a browser (vscode.dev / github.dev), the global config directory
    (<code>~/.vscode-surround/</code>) is <strong>not accessible</strong> because there is no
    local file system. To use custom snippets in web environments, either:
    <ul>
      <li>Use <code>surround.items</code> in your settings — these sync via Settings Sync</li>
      <li>Use project-level config files (<code>.vscode-surround/</code>) committed to your repo</li>
    </ul>
  </div>

  <div class="callout callout-info">
    <strong>Tip:</strong> Config files get full JSON schema validation and IntelliSense in
    <code>.vscode-surround/*.json</code> files automatically.
  </div>
</body>
</html>`;
}
