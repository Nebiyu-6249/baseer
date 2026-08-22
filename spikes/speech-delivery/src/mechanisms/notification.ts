import * as vscode from 'vscode';
import type { Fixture } from '../fixtures';
import { logAnnouncement } from '../log';

export const NAME = 'A · notification';

/**
 * Candidate A — window.showInformationMessage.
 *
 * Screen readers announce notifications, so this is the lowest-effort option.
 * What the spike must establish: whether a 120-word string is announced in
 * full or truncated, whether it can be interrupted, and how intrusive the
 * stacking is for a user who runs a command repeatedly.
 */
export async function announce(fixture: Fixture): Promise<void> {
  logAnnouncement(NAME, fixture.label, fixture.text);
  await vscode.window.showInformationMessage(fixture.text);
}
