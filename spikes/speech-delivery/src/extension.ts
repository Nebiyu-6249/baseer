import * as vscode from 'vscode';
import { FIXTURES } from './fixtures';
import { getChannel } from './log';
import * as notification from './mechanisms/notification';
import * as quickpick from './mechanisms/quickpick';
import * as readonlyEditor from './mechanisms/readonlyEditor';
import * as webviewLiveRegion from './mechanisms/webviewLiveRegion';

type Mechanism = {
  readonly commandId: string;
  readonly name: string;
  readonly announce: (fixture: (typeof FIXTURES)[number]) => Promise<void>;
};

const MECHANISMS: readonly Mechanism[] = [
  { commandId: 'baseerSpike.notification', ...notification, name: notification.NAME },
  { commandId: 'baseerSpike.quickpick', ...quickpick, name: quickpick.NAME },
  { commandId: 'baseerSpike.readonlyEditor', ...readonlyEditor, name: readonlyEditor.NAME },
  {
    commandId: 'baseerSpike.webviewLiveRegion',
    ...webviewLiveRegion,
    name: webviewLiveRegion.NAME,
  },
];

/**
 * Each mechanism advances through the fixtures independently, so the tester can
 * work one mechanism through all four strings before moving to the next, without
 * a shared counter jumping under them.
 */
const cursors = new Map<string, number>();

const PROTOCOL = `Baseer — ADR-0001 speech-delivery spike

Four candidate mechanisms, four fixtures each. Press a mechanism's keybinding
repeatedly; each press advances to the next fixture and wraps around.

  Ctrl+Alt+Shift+1   A  notification
  Ctrl+Alt+Shift+2   B  quickpick (chunked, arrow through, Escape to stop)
  Ctrl+Alt+Shift+3   C  read-only editor
  Ctrl+Alt+Shift+4   D  webview ARIA live region
  Ctrl+Alt+Shift+0   reset all cursors to fixture 1

Fixtures, in cycle order:
  1  short          10 words, 2 sentences
  2  medium         40 words, 3 sentences
  3  long           120 words, 8 sentences
  4  arabicMedium   Arabic translation of the medium string

Before you start: open the NVDA Speech Viewer (NVDA menu > Tools > Speech
Viewer) and leave it open for the whole session. Run "Baseer Spike: Show
announcement log" to get a timestamped record to line up against it.

For each mechanism x fixture, note:
  1  Announced at all?            yes / no / partial
  2  Announced correctly?         full text, or truncated / reordered / garbled
  3  Interruptible?               does Escape or a keypress stop it mid-utterance
  4  Chunked?                     can you take it at your own pace, or is it one blast
  5  Arabic RTL correct?          prose right-to-left, identifiers still left-to-right
  6  Focus stealing acceptable?   where did focus go, and did you get it back

Record results in the GitHub issue, then the decision matrix in
docs/adr/0001-speech-delivery.md gets filled in from them.
`;

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(readonlyEditor.register());

  for (const m of MECHANISMS) {
    context.subscriptions.push(
      vscode.commands.registerCommand(m.commandId, async () => {
        const i = cursors.get(m.commandId) ?? 0;
        const fixture = FIXTURES[i % FIXTURES.length];
        cursors.set(m.commandId, (i + 1) % FIXTURES.length);
        if (!fixture) return;
        await m.announce(fixture);
      }),
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('baseerSpike.resetCycles', async () => {
      cursors.clear();
      await vscode.window.showInformationMessage('Baseer spike: all cycles reset to fixture 1.');
    }),
    vscode.commands.registerCommand('baseerSpike.showProtocol', async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: PROTOCOL,
        language: 'plaintext',
      });
      await vscode.window.showTextDocument(doc);
    }),
    vscode.commands.registerCommand('baseerSpike.showLog', () => {
      getChannel().show(true);
    }),
  );

  getChannel().appendLine('Baseer speech-delivery spike activated. Ctrl+Alt+Shift+1..4.');
}

export function deactivate(): void {
  // Nothing to tear down; disposables are owned by the extension context.
}
