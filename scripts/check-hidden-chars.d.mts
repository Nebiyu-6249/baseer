export interface HiddenCharHit {
  readonly line: number;
  readonly column: number;
  readonly codePoint: number;
  readonly name: string;
}

export const HIDDEN: ReadonlyMap<number, string>;
export function findHidden(text: string): HiddenCharHit[];
export function isBinary(bytes: Uint8Array): boolean;
export function formatCodePoint(cp: number): string;
