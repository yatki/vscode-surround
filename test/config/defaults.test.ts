import { builtinSnippets } from "../../src/config/defaults";

describe("builtinSnippets", () => {
  it("should have 59 built-in snippets", () => {
    expect(Object.keys(builtinSnippets)).toHaveLength(59);
  });

  it("should have unique labels", () => {
    const labels = Object.values(builtinSnippets).map((s) => s.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });

  it("every snippet should have required fields", () => {
    for (const [key, snippet] of Object.entries(builtinSnippets)) {
      expect(snippet.label).toBeTruthy();
      expect(snippet.snippet).toBeTruthy();
      expect(snippet._source).toBe("builtin");
      expect(snippet._key).toBe(key);
      expect(snippet.commandName).toBe(key);
    }
  });

  it("element snippet should have languageIds", () => {
    expect(builtinSnippets.element.languageIds).toEqual([
      "html",
      "typescriptreact",
      "javascriptreact",
      "jsx",
      "markdown",
    ]);
  });

  it("JS/TS snippets should have correct languageIds", () => {
    const jstsLangs = [
      "javascript",
      "typescript",
      "javascriptreact",
      "typescriptreact",
    ];
    const jstsKeys = [
      "consoleLog",
      "consoleError",
      "promiseWrapper",
      "setTimeoutSnippet",
      "setIntervalSnippet",
      "jsonStringify",
      "jsonParse",
      "typeofCheck",
    ];
    for (const key of jstsKeys) {
      expect(builtinSnippets[key].languageIds).toEqual(jstsLangs);
    }
  });

  it("React snippets should have correct languageIds", () => {
    const reactLangs = ["javascriptreact", "typescriptreact"];
    const reactKeys = [
      "reactFragment",
      "reactSuspense",
      "reactConditional",
      "reactTernary",
      "reactMap",
    ];
    for (const key of reactKeys) {
      expect(builtinSnippets[key].languageIds).toEqual(reactLangs);
    }
  });

  it("Python snippets should have correct languageIds", () => {
    const pyLangs = ["python"];
    const pyKeys = [
      "pyTryExcept",
      "pyTryExceptFinally",
      "pyWith",
      "pyDef",
      "pyAsyncDef",
      "pyClass",
      "pyFor",
      "pyWhile",
      "pyIf",
      "pyIfMain",
      "pyDecorator",
      "pyListComp",
    ];
    for (const key of pyKeys) {
      expect(builtinSnippets[key].languageIds).toEqual(pyLangs);
    }
  });

  it("Go snippets should have correct languageIds", () => {
    const goLangs = ["go"];
    const goKeys = [
      "goIfErr",
      "goFor",
      "goForRange",
      "goFunc",
      "goGoroutine",
      "goDefer",
      "goSelect",
      "goSwitch",
      "goIfElse",
      "goMethod",
      "goMutex",
    ];
    for (const key of goKeys) {
      expect(builtinSnippets[key].languageIds).toEqual(goLangs);
    }
  });
});
