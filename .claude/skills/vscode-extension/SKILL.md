---
name: vscode-extension
description: VS Code Extension API reference for Baseer. Use when writing extension.ts, contribution points in package.json, commands, status bar items, webviews, SecretStorage, or localization. Contains verified facts about what IS and IS NOT in the public stable API.
---

# VS Code Extension API — Baseer working notes

**Verification date:** 2026-08-21, against `microsoft/vscode@main`
`src/vscode-dts/vscode.d.ts` (21,235 lines), fetched via raw.githubusercontent.
Re-verify before relying on any "absent" claim below.

## The single most important fact for this project

The VS Code **Accessibility Guidelines wiki is written for VS Code core
contributors, not extension authors.** The APIs it names —
`IAccessibleViewService.registerProvider()` and `aria.alert()` — are
internal services (`vs/platform/accessibility/...`,
`vs/base/browser/ui/aria/aria`). They are **NOT** in `vscode.d.ts` and are
**NOT** callable from an extension host process.

Verified absent from the public stable API:
- `IAccessibleViewService` — 0 occurrences
- `registerAccessibilityHelpProvider` — 0 occurrences
- `aria.alert` — 0 occurrences
- any screen-reader-active / `isScreenReaderOptimized` detection — 0 occurrences

Do not write code against them. Do not claim the extension "registers an
accessible view provider" until an actual mechanism is proven in a running
Extension Development Host.

## What the public accessibility surface actually is

`AccessibilityInformation` is the whole of it:

```ts
export interface AccessibilityInformation {
  readonly label: string;   // what the screen reader speaks on focus
  readonly role?: string;   // ARIA widget role; omit to let VS Code choose
}
```

It can be attached to exactly these, and nothing else:

| Type | dts line |
|---|---|
| `LanguageStatusItem.accessibilityInformation` | 7325 |
| `StatusBarItem.accessibilityInformation` | 7634 |
| `TreeItem.accessibilityInformation` | 12375 |
| `TreeItem.checkboxState.accessibilityInformation` | 12396 |
| `NotebookCellStatusBarItem.accessibilityInformation` | 16315 |

Note these are all **focus-time labels**. None of them is an
announce-now / live-region primitive.

## Getting text spoken: the practical ladder

There is no public "speak this string" API. In descending reliability:

1. **`window.showInformationMessage(text)`** — renders a notification.
   Screen readers announce notifications. Reliable, but visually intrusive
   and it stacks up. Best for short, important, user-initiated results.
2. **Focused QuickPick / InputBox with the text as the label or title** —
   focus moves, so the screen reader reads it. Interruptible by Escape.
   Good for chunked, stepped output (matches `explainSelection`'s
   "≤2 sentences per chunk, interruptible" requirement).
3. **A focused read-only editor / webview with correct ARIA** — best for
   long output the user wants to navigate and re-read rather than hear once.
4. **`window.setStatusBarMessage()` / `StatusBarItem`** — *not* reliably
   announced. Use for persistent state (budget counter, verbosity level),
   never as the only channel for a result.

Pick per command and write the choice down. Do not assume (1) is right for
everything; a verbose file summary delivered as a notification is a bad
experience.

## Localization: prefer `vscode.l10n` over hand-rolled i18n

`vscode.l10n` is stable public API (dts line 18194):

```ts
l10n.t('Module {0} contains {1} functions', name, count);
l10n.t({ message: 'Hello {name}', args: { name }, comment: ['greeting'] });
l10n.bundle;  // loaded bundle or undefined
```

- Bundles live in `l10n/bundle.l10n.<locale>.json`, declared via the
  `"l10n"` key in package.json.
- Locale follows `env.language` (dts line 10770), which follows the VS Code
  display language — **not** an extension setting.
- Consequence for Baseer: `baseer.toggleLanguage` cannot drive `l10n.t()`.
  Switching VS Code's own display language requires a reload. So Baseer
  needs its own runtime-switchable string table for the Arabic toggle, and
  may use `l10n` only for static contributed strings (command titles,
  setting descriptions). See ADR-0002 when written.
- `package.nls.json` / `package.nls.ar.json` localize package.json
  contributions (command titles etc.) and are also display-language-bound.

## Contribution points Baseer will use

- `contributes.commands` — every command, with `title` and `category: "Baseer"`.
- `contributes.keybindings` — `key`, `mac`, `when` clauses.
- `contributes.configuration` — settings under a `baseer.*` namespace.
  An extension may declare any key, including `accessibility.verbosity.baseer`,
  but **core owns the `accessibility.verbosity.*` namespace** and only reads
  providers it registered itself. Declaring the key does not wire it to the
  accessible-view help dialog. Treat it as a Baseer-read setting only, and
  verify behaviour in the dev host before documenting otherwise.
- `contributes.menus` — `commandPalette`, `editor/context`.

## Secrets

`ExtensionContext.secrets: SecretStorage` — `get`/`store`/`delete`, all async,
backed by the OS keychain (Windows Credential Manager, macOS Keychain,
libsecret on Linux). This is the only sanctioned place for the OpenAI API key.
Never `globalState`, never `settings.json`, never `.env`.

## Activation

Prefer narrow activation events. `onCommand:` entries are implicit for
declared commands since VS Code 1.74 — do not list them redundantly. Avoid
`*`. `onLanguage:python` / `onLanguage:javascript` is the right trigger for
the AST layer.

## Gotchas

- `extensionUri` (not `__dirname`) to locate bundled assets such as `.wasm`
  grammars; `__dirname` breaks in web/remote hosts.
- esbuild must mark `vscode` as **external** — it is injected by the host.
- **Extension host Node version — verify, do not assume.** An earlier note
  here said "Node 20 for VS Code 1.9x"; that is stale. VS Code `main` is
  1.135.0, shipping Electron 42.8.1 and built with Node 24.18.0, so the host
  is well above Node 20. The exact bundled Node version was **not** verified
  (the `electron/releases` lite.json only covers up to Electron 22). This
  matters because `openai@7.x` declares `engines: node >=22.0.0`
  (`6.49.0` is the last release without that constraint). Confirm empirically
  with `process.versions.node` in the Extension Development Host before
  finalising the `openai` pin and the `engines.vscode` floor.
