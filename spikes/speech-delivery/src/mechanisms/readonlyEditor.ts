import * as vscode from 'vscode';
import { splitSentences, type Fixture } from '../fixtures';
import { logAnnouncement, logDismissed } from '../log';

export const NAME = 'C · read-only editor';

/** Documents served by a TextDocumentContentProvider are read-only by design. */
export const SCHEME = 'baseer-spike';

const contents = new Map<string, string>();

class SpikeContentProvider implements vscode.TextDocumentContentProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidChange = this.emitter.event;

  public provideTextDocumentContent(uri: vscode.Uri): string {
    return contents.get(uri.toString()) ?? '';
  }

  public refresh(uri: vscode.Uri): void {
    this.emitter.fire(uri);
  }
}

const provider = new SpikeContentProvider();

export function register(): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider),
    // A document has no dismiss gesture of its own; closing its tab is the
    // moment the extension can observe the user is done with it. Note that a
    // preview tab replaced by the next press also reports as closed — the
    // logged path says which fixture it was.
    vscode.window.tabGroups.onDidChangeTabs((e) => {
      for (const tab of e.closed) {
        if (tab.input instanceof vscode.TabInputText && tab.input.uri.scheme === SCHEME) {
          logDismissed(NAME, `tab closed: ${tab.input.uri.path}`);
        }
      }
    }),
  );
}

/**
 * Candidate C — a focused, genuinely read-only document.
 *
 * Best case for long output the user wants to navigate and re-read rather than
 * hear once: arrow keys, Braille display, and find all work. What the spike must
 * establish is the cost — it steals focus from the editor the user was in, which
 * may be unacceptable for a quick summary.
 *
 * One line per sentence, so line-by-line arrow navigation matches speech chunks.
 */
export async function announce(fixture: Fixture): Promise<void> {
  logAnnouncement(NAME, fixture.label, fixture.text);

  const uri = vscode.Uri.parse(`${SCHEME}:${fixture.id}.txt`);
  const body = splitSentences(fixture.text).join('\n');
  contents.set(uri.toString(), body);
  provider.refresh(uri);

  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: true, preserveFocus: false });
}
