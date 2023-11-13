import { compare as comparePatches } from 'fast-json-patch';


export function compare<T>(a: T, b: T) {
  return comparePatches(a as any, b as any).filter((op) => !op.path.startsWith('/size'));
}
