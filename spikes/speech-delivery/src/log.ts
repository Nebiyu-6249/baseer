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
