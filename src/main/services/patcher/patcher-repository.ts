import { Patch, PatchAction, PatcherActionTypes } from './patcher-types';

export const PatcherRepository = {
  /**
   * Creates an action representing impoprting a patch.
   * @param patch The patch to import.
   */
  patch: (patch: Patch): PatchAction => ({
    type: PatcherActionTypes.PATCH,
    payload: patch,
    undoable: false,
  }),
};
