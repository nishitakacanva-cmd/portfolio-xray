import manifest from './asset-manifest.json';
type Entry = { path: string; w: number; h: number; alpha: boolean; derivedFrom?: string };
const M = manifest as Record<string, Entry>;
/** Resolve a semantic asset key to its verified relative path. Throws in dev if the key is unknown,
 *  so a guessed filename can never reach the page. */
export function asset(key: string): Entry {
  const e = M[key];
  if (!e) throw new Error('Unknown asset key: ' + key);
  return e;
}
export const ALL_ASSET_KEYS = Object.keys(M);
