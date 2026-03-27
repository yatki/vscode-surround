import type { ExtensionContext, Memento } from "vscode";
import { activate } from "../src/surround";

jest.mock(
  "vscode",
  () => {
    return {
      extensions: {
        getExtension: jest.fn().mockImplementation(() => {
          return {
            packageJSON: {
              version: "dummy-version",
            },
          };
        }),
      },
      workspace: {
        getConfiguration: jest.fn().mockImplementation(() => ({
          get: jest.fn().mockReturnValue(undefined),
        })),
        onDidChangeConfiguration: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        createFileSystemWatcher: jest.fn().mockReturnValue({
          onDidCreate: jest.fn(),
          onDidChange: jest.fn(),
          onDidDelete: jest.fn(),
          dispose: jest.fn(),
        }),
        workspaceFolders: undefined,
        fs: {
          readDirectory: jest.fn().mockRejectedValue(new Error("Not found")),
        },
      },
      window: {
        state: { focused: true },
        showWarningMessage: jest.fn().mockResolvedValue(undefined),
        showInformationMessage: jest.fn().mockResolvedValue(undefined),
      },
      commands: {
        registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        getCommands: jest.fn().mockResolvedValue([]),
      },
      env: {
        uiKind: 1, // UIKind.Desktop
      },
      Uri: {
        file: jest.fn().mockImplementation((p: string) => ({ fsPath: p, toString: () => p })),
        joinPath: jest.fn().mockImplementation((base: any, ...parts: string[]) => ({
          fsPath: [base.fsPath, ...parts].join("/"),
          toString: () => [base.fsPath, ...parts].join("/"),
        })),
      },
      RelativePattern: jest.fn(),
    };
  },
  { virtual: true }
);

type TestExtensionContext = {
  globalState: Partial<Memento>;
  subscriptions: any[];
};

const context: TestExtensionContext = {
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
  },
  subscriptions: [],
};

describe("activate", () => {
  it("should read the correct previous version", () => {
    activate(context as unknown as ExtensionContext);

    expect(context.globalState.get).toHaveBeenCalledWith(
      "yatki.vscode-surround:last-version"
    );
  });
});
