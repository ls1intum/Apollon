import { compare as comparePatches } from 'fast-json-patch';
import { Patch } from './patcher-types';

export function compare<T>(a: T, b: T): Patch {
  return comparePatches(a as any, b as any).filter((op) => !op.path.startsWith('/size'));
}
