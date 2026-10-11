import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getChannel(): vscode.OutputChannel {
  channel ??= vscode.window.createOutputChannel('Baseer Spike');
  return channel;
}

/**
 * Records what was announced, when, and by which mechanism, so the tester can
 * line the log up against the NVDA Speech Viewer transcript afterwards.
 */
export function logAnnouncement(mechanism: string, fixtureLabel: string, text: string): void {
  const ts = new Date().toISOString();
  getChannel().appendLine(`[${ts}] ${mechanism} :: ${fixtureLabel}`);
  getChannel().appendLine(`    ${text}`);
}

/**
 * Records that the extension itself observed the user closing a mechanism —
 * the only thing ADR-0001 criterion 3b scores. NVDA's Ctrl silences speech
 * without telling the extension anything, and an extension that is never told
 * cannot abort the LLM request behind the speech. No DISMISSED line, no 3b.
 */
export function logDismissed(mechanism: string, how: string): void {
  const ts = new Date().toISOString();
  getChannel().appendLine(`[${ts}] ${mechanism} :: DISMISSED (${how}) — extension notified`);
}
