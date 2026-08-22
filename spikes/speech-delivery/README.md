# Baseer speech-delivery spike (ADR-0001)

**Throwaway.** Not shipped, not published, not part of the Baseer extension.
It exists to answer one question with real evidence: *how should Baseer get
text to a screen reader?*

VS Code exposes **no public announce-now API** — `IAccessibleViewService` and
`aria.alert` are internal to VS Code core and unavailable to extensions
(verified against `vscode.d.ts`; see `.claude/skills/vscode-extension/SKILL.md`).
So the delivery mechanism has to be chosen empirically, under a real screen
reader, before any Baseer command's output path is written.

## Install

```sh
code --install-extension baseer-speech-delivery-spike.vsix
```

Reload the window afterwards.

## Run

Open the NVDA Speech Viewer (NVDA menu → Tools → Speech Viewer) and leave it
open. Then:

| Keybinding | Mechanism |
|---|---|
| `Ctrl+Alt+Shift+1` | **A** notification (`showInformationMessage`) |
| `Ctrl+Alt+Shift+2` | **B** QuickPick, chunked, Escape to stop |
| `Ctrl+Alt+Shift+3` | **C** read-only editor (custom scheme, genuinely read-only) |
| `Ctrl+Alt+Shift+4` | **D** webview with ARIA live region + strict CSP |
| `Ctrl+Alt+Shift+0` | reset all cycles to fixture 1 |

Each press of a mechanism's key advances to the next fixture and wraps:

1. **short** — 10 words, 2 sentences
2. **medium** — 40 words, 3 sentences
3. **long** — 120 words, 8 sentences
4. **arabicMedium** — Arabic translation of the medium string

So four presses of one key walks that mechanism through all four fixtures.
Cycles are per-mechanism, so you can finish one mechanism before starting
the next.

`Baseer Spike: Show announcement log` gives a timestamped record to line up
against the Speech Viewer transcript. `Baseer Spike: Show test protocol`
prints the same instructions inside the editor.

## What to record

Six criteria per mechanism × fixture — announced at all, announced correctly,
interruptible, chunked, Arabic RTL correct, focus stealing acceptable. Full
definitions and the results table are in `docs/adr/0001-speech-delivery.md`.

## Uninstall

```sh
code --uninstall-extension baseer-spike-local.baseer-speech-delivery-spike
```
