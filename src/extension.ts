import * as vscode from 'vscode';
import { registerCommands } from './commands';

/**
 * Extension entry point. Per the architecture in BASEER_BOOTSTRAP_PROMPT.md this
 * file does activation wiring only — no feature logic lives here.
 */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(...registerCommands());
}

export function deactivate(): void {
  // Nothing to tear down yet. Disposables are owned by the extension context.
}
