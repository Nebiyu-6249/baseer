---
name: tree-sitter-wasm
description: web-tree-sitter (WASM) integration for Baseer's AST layer. Use when writing src/ast/parser.ts, loading Python/JavaScript grammars, sourcing .wasm files, or walking syntax trees. Covers the 0.25+ API break.
---

# web-tree-sitter in a VS Code extension

**Verified 2026-08-21:** `web-tree-sitter@0.26.12` (published 2026-08-08).

## The version trap

Verified state of the reference repos (2026-08-21):

- `cursorless-dev/vscode-parse-tree` v0.58.0 pins **`web-tree-sitter: "0.26.10"`**
  — exact, no caret — and targets `engines.vscode ^1.98.0`. It is on the
  modern API and is the good reference.
- `selfint/vscode-tree-sitter` v0.0.1 uses **`web-tree-sitter ^0.20.8`**
  (`engines.vscode ^1.79.0`) and is on the old API.

So: most tutorials and `selfint/` target **0.20/0.21**, whose API was:

```js
const Parser = require('web-tree-sitter');
await Parser.init();
const Lang = await Parser.Language.load('tree-sitter-python.wasm');
```

0.25+ (what we will use) is ESM-first with **named exports** and no
default export:

```ts
import { Parser, Language } from 'web-tree-sitter';
await Parser.init();                       // must be awaited once, process-wide
const lang = await Language.load(wasmBytes);
const parser = new Parser();
parser.setLanguage(lang);
const tree = parser.parse(sourceText);
```

Copying a tutorial verbatim will fail. When an example does not compile,
suspect the version before suspecting the environment.

**Pin `web-tree-sitter` exactly, with no caret.** Cursorless does this
deliberately: the wasm ABI between the runtime and the prebuilt grammar
files is version-coupled, and a semver-minor bump can desynchronise them.
Pin the grammar package exactly too, and bump the pair together.

## Sourcing the .wasm grammars — decide deliberately

`tree-sitter-python` / `tree-sitter-javascript` on npm ship **C source plus a
native Node binding**, not a prebuilt `.wasm`. `web-tree-sitter` cannot load
them. Options, with the trade-off that matters:

| Option | Pro | Con |
|---|---|---|
| `@vscode/tree-sitter-wasm` (0.3.1, 2026-04-07) | Microsoft-published, same grammars VS Code itself ships, good supply-chain story | Only the languages VS Code uses; version tied to their needs |
| `tree-sitter-wasms` (0.1.13, 2025-10-07) | Many languages prebuilt | Small community package — audit before trusting. Note Cursorless maintains its own fork, `@cursorless/tree-sitter-wasms`, rather than depending on it; treat that as a signal |
| Build from source with `tree-sitter build --wasm` | Full control, pinned grammar commit | Needs Emscripten or Docker in CI; slowest path |
| Vendor checked-in `.wasm` via git-lfs | Reproducible, no build-time fetch | Binary blobs in the repo; needs a documented provenance + refresh procedure |

For Baseer, weigh `@vscode/tree-sitter-wasm` first (supply-chain item 8 in
the security spec favours a Microsoft-published artifact). Confirm it
actually contains Python and JavaScript before committing to it — do not
assume. Whatever is chosen, record it in an ADR with the checksum.

## Loading inside the extension host

- Read the wasm with `vscode.workspace.fs.readFile(Uri.joinPath(context.extensionUri, ...))`
  and hand `Language.load()` the bytes. Do not pass a filesystem path —
  paths break under remote/web extension hosts.
- `Parser.init()` is process-wide and must complete before any `new Parser()`.
  Wrap it in a memoised promise; never call it per-command.
- Parsers are stateful and not thread-safe. Either pool one parser per
  language or construct per parse. Call `.delete()` on trees and parsers —
  the WASM heap is not garbage collected for you.
- Grammar load is the slow part (tens of ms). Cache `Language` objects by
  language id for the session; do not cache them across a grammar upgrade.

## Incremental reparse

For `summarizeLastDiff` and cursor-tracking, keep the previous `Tree` and
feed edits via `tree.edit(delta)` then `parser.parse(newText, oldTree)`.
Map `vscode.TextDocumentContentChangeEvent` to tree-sitter's
`{ startIndex, oldEndIndex, newEndIndex, startPosition, oldEndPosition,
newEndPosition }`. Getting the byte-vs-UTF16-offset conversion wrong is the
classic bug here: VS Code offsets are UTF-16 code units, tree-sitter indices
are bytes. Non-ASCII source (including Arabic in comments/strings) will
desynchronise if this is fudged.

## Narration-relevant node types

- Python: `module`, `class_definition`, `function_definition`,
  `decorated_definition`, `import_statement`, `import_from_statement`,
  `parameters`, `block`.
- JavaScript: `program`, `class_declaration`, `function_declaration`,
  `arrow_function`, `method_definition`, `lexical_declaration`,
  `import_statement`, `export_statement`.

Use the **named** children (`node.namedChildren`) when narrating; anonymous
nodes are punctuation and must never be spoken.

Prefer tree-sitter **queries** (`.scm`) over hand-rolled recursive walks for
the narrator — they are declarative, testable, and far easier to keep in sync
across two grammars.

## Anti-pattern: do not download grammars at runtime

`selfint/vscode-tree-sitter` fetches parsers from npm on demand. It requires
the *user* to have `node`, `npm`, and a global `electron-rebuild` installed,
and it pulls executable code at runtime. That is a supply-chain hole and a
hostile setup burden — doubly so for a screen-reader user debugging a failed
native rebuild.

Baseer bundles its grammars in the `.vsix`. Fixed set, known checksums,
works offline, nothing fetched at runtime.

Its other documented failure is worth stealing as a test case: VS Code
`languageId` does not always match the tree-sitter parser name
(`typescriptreact` -> `tree-sitter-typescript.tsx`,
`javascriptreact` -> `tree-sitter-javascript`). Keep an explicit
languageId -> grammar map from day one rather than inferring the name.
