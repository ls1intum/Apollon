import { Reducer } from 'redux';
import { Patcher } from './patcher';
import { PatcherActionTypes } from './patcher-types';
import { deepClone } from 'fast-json-patch';

export type PatcherReducerOptions<T, U = T> = {
  /**
   * Transforms the state after applying the patch. This is useful
   * when the internal store schema differs from the schema exposed to the outside.
   * @param state The state in the external schema.
   * @returns The state in the internal schema.
   */
  transform?: (state: T) => U;

  /**
   * Merges the old state with the new state. This is useful when naive strategies
   * like `Object.assign` would trigger unwanted side-effects and more context-aware merging
   * of state is required.
   * @param oldState
   * @param newState
   * @returns The merged state.
   */
  merge?: (oldState: U, newState: U) => U;
};

const _DefaultOptions = {
  transform: (state: any) => state,
  merge: (oldState: any, newState: any) => ({ ...oldState, ...newState }),
};

/**
 * Creates a reducer that applies patches to the state using
 * given patcher.
 * @param patcher The patcher to use.
 * @param options Options for the reducer.
 */
export function createPatcherReducer<T, U = T>(
  patcher: Patcher<T>,
  options: PatcherReducerOptions<T, U> = _DefaultOptions,
): Reducer<U> {
  const transform = options.transform || _DefaultOptions.transform;
  const merge = options.merge || _DefaultOptions.merge;

  return (state = {} as U, action) => {
    const { type, payload } = action;
    if (type === PatcherActionTypes.PATCH) {
      const res = patcher.patch(payload);

      if (res.patched) {
        return merge(state, transform(res.result));
      }
    }

    return state;
  };
}
