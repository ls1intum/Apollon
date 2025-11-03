import jsonPatch from 'fast-json-patch';
import { Patch } from './patcher-types';

/**
 * Compares two objects and returns the difference
 * in the form of a [JSON patch](http://jsonpatch.com/)
 */
export function compare<T>(a: T, b: T): Patch {
  const patch = jsonPatch.compare(a as any, b as any).filter((op) => !op.path.startsWith('/size'));

  const relationshipIdsWithAffectedPaths: string[] = [];

  patch.forEach((op) => {
    const match = /\/relationships\/([\w-]+)\/path/g.exec(op.path);
    const relationshipId = match?.[1];
    if (relationshipId && !relationshipIdsWithAffectedPaths.includes(relationshipId)) {
      relationshipIdsWithAffectedPaths.push(relationshipId);
    }
  });

  const cleanedPatch = patch.filter((op) => {
    const match = /\/relationships\/([\w-]+)\//g.exec(op.path);
    const relationshipId = match?.[1];

    return !relationshipId || !relationshipIdsWithAffectedPaths.includes(relationshipId);
  });

  relationshipIdsWithAffectedPaths.forEach((id) => {
    const brel = (b as any).relationships[id];

    cleanedPatch.push({
      op: 'replace',
      path: `/relationships/${id}/isManuallyLayouted`,
      value: brel.isManuallyLayouted,
    });

    cleanedPatch.push({
      op: 'replace',
      path: `/relationships/${id}/path`,
      value: brel.path,
    });

    cleanedPatch.push({
      op: 'replace',
      path: `/relationships/${id}/bounds`,
      value: brel.bounds,
    });
  });

  return cleanedPatch;
}
