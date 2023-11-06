import { Patch, PatchAction, PatcherActionTypes } from './patcher-types';


export const PatcherRepository = {
  patch: (patch: Patch): PatchAction => ({
    type: PatcherActionTypes.PATCH,
    payload: patch,
    undoable: false,
  }),
};
