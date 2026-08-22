import * as vscode from 'vscode';
import { COMMAND_IDS, type CommandId } from './ids';

export { COMMAND_IDS, type CommandId };

/**
 * Placeholder handler used until ADR-0001 settles how Baseer delivers speech.
 *
 * IMPORTANT: `showInformationMessage` here is scaffolding, NOT a decision. VS Code
 * exposes no public announce-now API (see .claude/skills/vscode-extension/SKILL.md),
 * so the real delivery surface is an open question resolved by the ADR-0001 spike.
 * Do not copy this call into feature code.
 */
async function notYetImplemented(id: CommandId): Promise<void> {
  await vscode.window.showInformationMessage(
    `Baseer: ${id} is not implemented yet. Speech delivery is pending ADR-0001.`,
  );
}

export function registerCommands(): vscode.Disposable[] {
  return COMMAND_IDS.map((id) => vscode.commands.registerCommand(id, () => notYetImplemented(id)));
}
