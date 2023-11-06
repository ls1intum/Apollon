import { Reducer } from 'redux';
import { Patcher } from './patcher';
import { PatcherActionTypes } from './patcher-types';


export type PatcherReducerOptions<T, U=T> = {
  transform?: (state: T) => U;
};

const _DefaultOptions: PatcherReducerOptions<any> = {
  transform: (state) => state,
};


export function createPatcherReducer<T, U=T>(
  patcher: Patcher<T>,
  options: PatcherReducerOptions<T, U> = _DefaultOptions,
): Reducer<U> {
  const transform = options.transform || _DefaultOptions.transform!;

  return (state = {} as U, action) => {
    const { type, payload } = action;
    if (type === PatcherActionTypes.PATCH) {
      return transform(patcher.patch(payload.patch));
    }

    return state;
  };
}
