import { Action, Reducer, UnknownAction } from 'redux';
import { Patcher } from './patcher';
import { Patch, PatchAction, PatcherActionTypes } from './patcher-types';
import { SignedPatch } from './patch-verifier';

/**
 * Options for the patcher reducer.
 * @template T The external schema of the state.
 * @template U The internal schema of the state.
 */
export type PatcherReducerOptions<T, U = T> = {
  /**
   * Transforms the state after applying the patch. This is useful
   * when the internal store schema differs from the schema exposed to the outside.
   * @param state The state in the external schema.
   * @returns The state in the internal schema.
   */
  transform?: (state: T) => U;

  /**
   * Transforms the state before applying the patch. This is useful
   * when the internal store schema differs from the schema exposed to the outside.
   * @param state The state in the internal schema.
   * @returns The state in the external schema.
   */
  transformInverse?: (state: U) => T;

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
  transform: <T>(state: T) => state,
  transformInverse: <T>(state: T) => state,
  merge: <T>(oldState: T, newState: T) => ({ ...oldState, ...newState }),
};

/**
 * Creates a reducer that applies patches to the state using
 * given patcher.
 * @template T The external schema of the state (exposed to users, for example via patches).
 * @template A The action type the reducer is supposed to handle.
 * @template U The internal schema of the state (as managed in the store).
 * @param patcher The patcher to use.
 * @param options Options for the reducer.
 */
export function createPatcherReducer<T, A extends Action, U = T>(
  patcher: Patcher<T>,
  options: PatcherReducerOptions<T, U> = _DefaultOptions as PatcherReducerOptions<T, U>,
): Reducer<U, PatchAction | A | UnknownAction> {
  const transform = options.transform || (_DefaultOptions.transform as (s: T) => U);
  const transformInverse = options.transformInverse || (_DefaultOptions.transformInverse as (s: U) => T);
  const merge = options.merge || _DefaultOptions.merge;

  return (state, action: PatchAction | UnknownAction) => {
    const { type } = action;
    if (type === PatcherActionTypes.PATCH && state) {
      const { payload } = action as unknown as PatchAction;
      const res = patcher.patch(payload as Patch | SignedPatch, transformInverse(state));

      if (res.patched) {
        return merge((state ?? {}) as U, transform(res.result));
      }
    }

    return state as U;
  };
}
