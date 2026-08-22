import * as vscode from 'vscode';
import { chunk, type Fixture } from '../fixtures';
import { logAnnouncement } from '../log';

export const NAME = 'B · quickpick';

/**
 * Candidate B — a focused QuickPick, one item per ≤2-sentence chunk.
 *
 * Focus moves to each item as the user arrows through it, so the screen reader
 * reads it. This is the only candidate whose natural affordance is the chunked,
 * self-paced, Escape-interruptible model the MVP spec asks for, so the spike
 * exercises it that way rather than dumping the whole string into one label.
 */
export async function announce(fixture: Fixture): Promise<void> {
  logAnnouncement(NAME, fixture.label, fixture.text);

  const chunks = chunk(fixture.text, 2);
  const qp = vscode.window.createQuickPick();
  qp.title = `Baseer spike — ${fixture.label}`;
  qp.placeholder = 'Arrow through the chunks. Escape to stop.';
  qp.matchOnDescription = false;
  qp.matchOnDetail = false;
  qp.items = chunks.map((text, i) => ({
    label: text,
    description: `${i + 1} of ${chunks.length}`,
  }));

  await new Promise<void>((resolve) => {
    qp.onDidHide(() => {
      qp.dispose();
      resolve();
    });
    qp.onDidAccept(() => qp.hide());
    qp.show();
  });
}
