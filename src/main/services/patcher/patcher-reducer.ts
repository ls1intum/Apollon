import { Reducer } from 'redux';
import { Patcher } from './patcher';
import { PatcherActionTypes } from './patcher-types';

export type PatcherReducerOptions<T, U = T> = {
  /**
   * Transforms the state after applying the patch. This is useful
   * when the internal store schema differs from the schema exposed to the outside.
   * @param state The state in the external schema.
   * @returns The state in the internal schema.
   */
  transform?: (state: T) => U;
};

const _DefaultOptions = {
  transform: (state: any) => state,
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

  return (state = {} as U, action) => {
    const { type, payload } = action;
    if (type === PatcherActionTypes.PATCH) {
      const res = transform(patcher.patch(payload));

      return {
        ...state,
        ...res,
      };
    }

    return state;
  };
}
