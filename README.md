# Surround

[![Visual Studio Marketplace](https://img.shields.io/vscode-marketplace/v/yatki.vscode-surround.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yatki.vscode-surround)
[![Visual Studio Marketplace](https://img.shields.io/vscode-marketplace/d/yatki.vscode-surround.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yatki.vscode-surround)
[![GitHub last commit](https://img.shields.io/github/last-commit/yatki/vscode-surround.svg?style=flat-square)](https://github.com/yatki/vscode-surround)
[![License](https://img.shields.io/github/license/yatki/vscode-surround.svg?style=flat-square)](https://github.com/yatki/vscode-surround)

<p align="center">
<br />
<img src="https://raw.githubusercontent.com/yatki/vscode-surround/master/images/logo.png">

A simple yet powerful extension to add wrapper templates around your code blocks.

</p>

## Features

- Supports **multi** selections
- Fully **customizable**
- **Custom** wrapper functions
- You can assign **shortcuts** for _each_ wrapper function separately
- Nicely formated

### Demo 1: Choosing wrapper function from quick pick menu

![Demo 1](https://raw.githubusercontent.com/yatki/vscode-surround/master/images/demo.gif)

### Demo 2: Wrapping multi selections

![Demo 2](https://raw.githubusercontent.com/yatki/vscode-surround/master/images/demo2.gif)

## How To Use

You can press (`ctrl` + `shift` + `T`) or (`cmd` + `shift` + `T`) to get list of commands and pick one of them.

Each wrapper has a **separate command** so you can define keybindings for each wrapper by searching `surround.with.commandName`

### List of commands

| Command                                  | Snippet                                                       |
| ---------------------------------------- | ------------------------------------------------------------- |
| `surround.with` (`ctrl` + `shift` + `T`) | List of all the enabled commands below                        |
| `surround.with.if`                       | if ($condition) { ... }                                       |
| `surround.with.ifElse`                   | if ($condition) { ... } else { $else }                        |
| `surround.with.tryCatch`                 | try { ... } catch (err) { $catchBlock }                       |
| `surround.with.tryFinally`               | try { ... } finally { $finalBlock }                           |
| `surround.with.tryCatchFinally`          | try { ... } catch (err) {$catchBlock} finally { $finalBlock } |
| `surround.with.for`                      | for ($1) { ... }                                              |
| `surround.with.fori`                     | for (let i = 0; ... ; i = i + 1) { ... }                      |
| `surround.with.forEach`                  | items.forEach((item) => { ... })                              |
| `surround.with.forEachAsync`             | items.forEach(async (item) => { ... })                        |
| `surround.with.forEachFn`                | items.forEach(function (item) { ... })                        |
| `surround.with.forEachAsyncFn`           | items.forEach(async function (item) { ... })                  |
| `surround.with.arrowFunction`            | const $name = ($params) => { ... }                            |
| `surround.with.asyncArrowFunction`       | const $name = async ($params) => { ... }                      |
| `surround.with.functionDeclaration`      | function $name ($params) { ... }                              |
| `surround.with.asyncFunctionDeclaration` | async function $name ($params) { ... }                        |
| `surround.with.functionExpression`       | const $name = function ($params) { ... }                      |
| `surround.with.asyncFunctionExpression`  | const $name = async function ($params) { ... }                |
| `surround.with.element`                  | \<element\>...\</element\>                                    |
| `surround.with.comment`                  | /\*\* ... \*/                                                 |
| `surround.with.region`                   | #region $regionName ... #endregion                            |

## Options

Each wrapper function config is defined as `ISurroundItem`:

```ts
interface ISurroundItem {
  label: string; // must be unique
  description?: string;
  detail?: string;
  snippet: string; // must be valid SnippetString
  disabled?: boolean; // default: false
}
```

Example:

```json
{
  "label": "if",
  "description": "if ($condition) { ... }",
  "disabled": false,
  "snippet": "if(${1:condition}) {\n\t$TM_SELECTED_TEXT\n}$0"
}
```

### How to define custom wrapper functions `surround.custom`

Example:

```js
{
  "surround.custom": {
    // identifier must be unique
    "myUniqureIdentifier": {
      // label must be unique
      "label": "myUniqeLabel",
      "description": "burrito { ... }",
      "snippet": "burrito { $TM_SELECTED_TEXT }$0"
    }
  }
}
```

Read More about [Creating your own snippets](https://code.visualstudio.com/docs/editor/userdefinedsnippets).

### IMPORTANT NOTES:

1.  Label must be unique
1.  You can redefine all snippets as long as you provide a valid [SnippetString](https://code.visualstudio.com/docs/extensionAPI/vscode-api#SnippetString).
1.  Each custom function will have it's own command `surround.with.customCommandName`, so you can assign shortcuts to your most used wrapper functions.
1.  If you do not provide a **unique** `identifier` or `label` your custom functions will override existing ones.

## Known Issues

Even though all of the wrapper functions were written for `Javascript`, I didn't set a `Language identifier` for the extension, because you can use it for _other_ languages by simply overriding existing snippets.

I would happily add built-in support for other languages if there is demand for it.

## Contribution

As always, I'm open to any contribution and would like to hear your feedback.

### Just an important reminder:

If you are planning to contribute to **any** open source project,
before starting development, please **always open an issue** and **make a proposal first**.
This will save you from working on features that are eventually going to be rejected for some reason.

## Logo

I designed the logo on [canva.com](https://canva.com) and inspired one of their free templates.

## LICENCE

MIT (c) 2017 Mehmet Yatkı

**Enjoy!**
