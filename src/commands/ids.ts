/**
 * Every Baseer command id.
 *
 * Deliberately free of any `vscode` import so it can be unit-tested outside the
 * extension host. `package.json` contributions and runtime registration are
 * asserted against this list in src/test/unit/commands.test.ts.
 */
export const COMMAND_IDS = [
  'baseer.summarizeFile',
  'baseer.describeSymbolAtCursor',
  'baseer.explainSelection',
  'baseer.summarizeLastDiff',
  'baseer.askAboutCode',
  'baseer.toggleVerbosity',
  'baseer.toggleLanguage',
  'baseer.stopSpeaking',
  'baseer.setApiKey',
  'baseer.revokeConsent',
  'baseer.purgeSecurityLog',
] as const;

export type CommandId = (typeof COMMAND_IDS)[number];
