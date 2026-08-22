import { describe, expect, it } from 'vitest';
import pkg from '../../../package.json';
import { COMMAND_IDS } from '../../commands/ids';

describe('command contributions', () => {
  it('registers exactly the commands declared in package.json', () => {
    const declared = pkg.contributes.commands.map((c) => c.command).sort();
    expect([...COMMAND_IDS].sort()).toEqual(declared);
  });

  it('binds every keybinding to a real command', () => {
    for (const kb of pkg.contributes.keybindings) {
      expect(COMMAND_IDS).toContain(kb.command as (typeof COMMAND_IDS)[number]);
    }
  });

  it('namespaces every command under baseer.', () => {
    for (const id of COMMAND_IDS) expect(id.startsWith('baseer.')).toBe(true);
  });
});
