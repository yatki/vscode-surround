jest.mock(
  "vscode",
  () => ({
    workspace: {
      getConfiguration: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
      }),
      fs: {
        readDirectory: jest.fn().mockRejectedValue(new Error("Not found")),
      },
      workspaceFolders: undefined,
    },
    window: {
      showWarningMessage: jest.fn().mockResolvedValue(undefined),
    },
    Uri: {
      file: jest.fn().mockImplementation((p: string) => ({ fsPath: p })),
      joinPath: jest.fn().mockImplementation((base: any, ...parts: string[]) => ({
        fsPath: [base.fsPath, ...parts].join("/"),
      })),
    },
  }),
  { virtual: true }
);

import { flattenItems, transformCustomToItems } from "../../src/config/loader";
import { ISurroundConfigItem, ISurroundSnippet } from "../../src/config/types";

describe("flattenItems", () => {
  it("should flatten a snippet group with languages", () => {
    const items: ISurroundConfigItem[] = [
      {
        languages: ["javascript", "typescript"],
        snippets: [
          { label: "if", snippet: "if($1){$TM_SELECTED_TEXT}" },
          { label: "for", snippet: "for($1){$TM_SELECTED_TEXT}" },
        ],
      },
    ];

    const result = flattenItems(items, "global");
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("if");
    expect(result[0].languageIds).toEqual(["javascript", "typescript"]);
    expect(result[0]._source).toBe("global");
    expect(result[1].label).toBe("for");
    expect(result[1].languageIds).toEqual(["javascript", "typescript"]);
  });

  it("should flatten a standalone snippet", () => {
    const items: ISurroundConfigItem[] = [
      {
        label: "comment",
        snippet: "/* $TM_SELECTED_TEXT */",
      },
    ];

    const result = flattenItems(items, "project");
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("comment");
    expect(result[0]._source).toBe("project");
    expect(result[0].languageIds).toBeUndefined();
  });

  it("should flatten a standalone snippet with languageIds", () => {
    const items: ISurroundConfigItem[] = [
      {
        label: "<el>",
        snippet: "<$1>$TM_SELECTED_TEXT</$1>",
        languageIds: ["html"],
      },
    ];

    const result = flattenItems(items, "global");
    expect(result).toHaveLength(1);
    expect(result[0].languageIds).toEqual(["html"]);
  });

  it("should handle mixed groups and standalone snippets", () => {
    const items: ISurroundConfigItem[] = [
      {
        languages: ["python"],
        snippets: [
          { label: "try", snippet: "try:\n\t$TM_SELECTED_TEXT\nexcept:" },
        ],
      },
      {
        label: "comment",
        snippet: "# $TM_SELECTED_TEXT",
      },
    ];

    const result = flattenItems(items, "project");
    expect(result).toHaveLength(2);
    expect(result[0].languageIds).toEqual(["python"]);
    expect(result[1].languageIds).toBeUndefined();
  });

  it("should handle group without languages (applies to all)", () => {
    const items: ISurroundConfigItem[] = [
      {
        snippets: [
          { label: "wrap", snippet: "($TM_SELECTED_TEXT)" },
        ],
      },
    ];

    const result = flattenItems(items, "global");
    expect(result).toHaveLength(1);
    expect(result[0].languageIds).toBeUndefined();
  });

  it("should preserve commandName on snippets", () => {
    const items: ISurroundConfigItem[] = [
      {
        label: "if",
        snippet: "if($1){$TM_SELECTED_TEXT}",
        commandName: "myIf",
      },
    ];

    const result = flattenItems(items, "global");
    expect(result[0].commandName).toBe("myIf");
  });

  it("should preserve disabled field", () => {
    const items: ISurroundConfigItem[] = [
      {
        label: "disabled-snippet",
        snippet: "...",
        disabled: true,
      },
    ];

    const result = flattenItems(items, "global");
    expect(result[0].disabled).toBe(true);
  });
});

describe("transformCustomToItems", () => {
  it("should transform key-value custom config to items array", () => {
    const custom: Record<string, ISurroundSnippet> = {
      log: {
        label: "console.log",
        snippet: "console.log($TM_SELECTED_TEXT)",
      },
      myAwait: {
        label: "await",
        snippet: "await ($TM_SELECTED_TEXT)",
        commandName: "customAwait",
      },
    };

    const result = transformCustomToItems(custom);
    expect(result).toHaveLength(2);

    // Key becomes commandName when not explicitly set
    expect(result[0]).toEqual({
      label: "console.log",
      snippet: "console.log($TM_SELECTED_TEXT)",
      commandName: "log",
    });

    // Explicit commandName is preserved
    expect(result[1]).toEqual({
      label: "await",
      snippet: "await ($TM_SELECTED_TEXT)",
      commandName: "customAwait",
    });
  });

  it("should skip invalid entries", () => {
    const custom: Record<string, any> = {
      valid: { label: "test", snippet: "test" },
      invalid: "not an object",
      noLabel: { snippet: "missing label" },
    };

    const result = transformCustomToItems(custom);
    expect(result).toHaveLength(1);
    expect((result[0] as ISurroundSnippet).label).toBe("test");
  });

  it("should return empty array for empty input", () => {
    const result = transformCustomToItems({});
    expect(result).toHaveLength(0);
  });
});
