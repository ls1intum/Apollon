import { Middleware, Dispatch, Action } from 'redux';
import { Patcher } from './patcher';

export type PatcherMiddleware<T, A extends Action> = Middleware<{}, T, Dispatch<A>>;

/**
 * Options for the patcher middleware.
 * @template T The external schema of the state.
 * @template U The internal schema of the state.
 * @template A The action type the middleware is supposed to handle.
 */
export type PatcherMiddlewareOptions<T, U = T, A extends Action = any> = {
  /**
   * Transforms the state before checking for changes. This is useful
   * when the internal store schema differs from the schema exposed to the outside.
   * @param state The state in the internal schema.
   * @returns The state in the external schema.
   */
  transform?: (state: U) => T;

  /**
   * Selects actions that should trigger a check for discrete changes. This is useful
   * when the patcher should only check for changes when certain actions are dispatched.
   */
  selectDiscrete?: (action: A) => boolean;

  /**
   * Selects actions that should trigger a check for continuous changes. Continuous changes
   * happen more frequently than discrete changes and are ok to miss a few.
   */
  selectContinuous?: (action: A) => boolean;
};

const _DefaultOptions = {
  transform: <T>(state: T) => state,
  selectDiscrete: () => true,
  selectContinuous: () => false,
};

/**
 * Creates a middleware that checks for changes to the state using
 * given patcher. The patcher in turn notifies subscribers of the changes it detects.
 * @template T The external schema of the state (exposed to users, for example via patches).
 * @template A The action type the middleware is supposed to handle.
 * @template U The internal schema of the state (as managed in the store).
 * @param patcher The patcher to use.
 * @param options Options for the middleware.
 */
export function createPatcherMiddleware<T, A extends Action = any, U = T>(
  patcher: Patcher<T>,
  options: PatcherMiddlewareOptions<T, U, A> = _DefaultOptions as PatcherMiddlewareOptions<T, U, A>,
): PatcherMiddleware<U, A> {
  const transform = options.transform || (_DefaultOptions.transform as (s: U) => T);
  const selectDiscrete = options.selectDiscrete || _DefaultOptions.selectDiscrete;
  const selectContinuous = options.selectContinuous || _DefaultOptions.selectContinuous;

  return (store) => {
    patcher.initialize(transform(store.getState()));

    return (next) => (action) => {
      const res = next(action);

      if (selectDiscrete(action as A)) {
        patcher.check(transform(store.getState()));
      } else if (selectContinuous(action as A)) {
        patcher.checkContinuous(transform(store.getState()));
      }

      return res;
    };
  };
}
