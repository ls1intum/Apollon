import { Middleware } from 'redux';
import { Patcher } from './patcher';

export type PatcherMiddleware<T> = Middleware<{}, T>;

export type PatcherMiddlewareOptions<T, U = T, A = any> = {
  /**
   * Transforms the state before checking for changes. This is useful
   * when the internal store schema differs from the schema exposed to the outside.
   * @param state The state in the internal schema.
   * @returns The state in the external schema.
   */
  transform?: (state: U) => T;

  /**
   * Selects actions that should trigger a check for changes. This is useful
   * when the patcher should only check for changes when certain actions are dispatched.
   */
  select?: (action: A) => boolean;
};

const _DefaultOptions = {
  transform: (state: any) => state,
  select: () => true,
};

/**
 * Creates a middleware that checks for changes to the state using
 * given patcher. The patcher in turn notifies subscribers of the changes it detects.
 * @param patcher The patcher to use.
 * @param options Options for the middleware.
 */
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
