import { Middleware } from 'redux';
import { Patcher } from './patcher';

export type PatcherMiddleware<T> = Middleware<{}, T>;

export type PatcherMiddlewareOptions<T, U = T, A = any> = {
  transform?: (state: U) => T;
  select?: (action: A) => boolean;
};

const _DefaultOptions = {
  transform: (state: any) => state,
  select: () => true,
};

export function createPatcherMiddleware<T, A = any, U = T>(
  patcher: Patcher<T>,
  options: PatcherMiddlewareOptions<T, U, A> = _DefaultOptions,
): PatcherMiddleware<U> {
  const transform = options.transform || _DefaultOptions.transform;
  const select = options.select || _DefaultOptions.select;

  return (store) => {
    patcher.initialize(transform(store.getState()));

    return (next) => (action: A) => {
      const res = next(action as any);

      if (select(action)) {
        patcher.check(transform(store.getState()));
      }

      return res;
    };
  };
}
