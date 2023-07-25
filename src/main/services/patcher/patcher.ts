import { compare, applyPatch } from 'fast-json-patch';

import { Patch, PatchListener, PatchStreamer, PatcherMiddleware, isDiscreteAction, isSelectionAction } from './patcher-types';


export type PatcherOptions<T, U=T, A=any> = {
  /**
   * 
   * The state stored in the store might not be of the same type
   * as the state that is kept in sync with remote clients. This option
   * allows you to transform the state before it is compared to the
   * previous state, so patches are made for the shared state type rather than
   * the local one.
   * 
   */
  transform?: (state: U) => T;

  /**
   * 
   * This function is used to determine whether a patch should be
   * produced for a given action. This is useful for actions that
   * are not relevant to the shared state, such as actions that
   * only affect the local state of a client. For each selected action, a diff
   * is performed on the entire state. For high-frequency actions, use streamers instead.
   * 
   */
  select?: (action: A) => boolean;

  /**
   * 
   * Some actions occur in high frequency and affect the shared state. For example,
   * moving an element creates a constant stream of patches that need to be synced with remote
   * clients. To avoid diffing the entire state on each such action, streamers are used,
   * which specifically produce patches for a given action.
   * 
   */
  streamers?: PatchStreamer<T, A>[];
};

const _DefaultOptions: PatcherOptions<any> = {
  transform: (state) => state,
  select: () => true,
  streamers: [],
};


/**
 * 
 * A patcher is a redux middleware that listens to actions and
 * produces patches based on the changes in the state. These patches
 * can then be used to update the state of a remote client, without
 * having to send the entire state.
 * 
 */
export class Patcher<T, A=any, U=T> {
  /**
   * 
   * The middleware that can be used in a redux store.
   * 
   */
  readonly middleware: PatcherMiddleware<U>;

  private snapshot?: T;
  // TODO: this should be switched with an observable pattern.
  private listeners: PatchListener[] = [];

  constructor(readonly options: PatcherOptions<T, U, A> = _DefaultOptions) {
    const transform = options.transform || _DefaultOptions.transform!;
    const select = options.select || _DefaultOptions.select!;

    this.middleware = (store) => {
      this.snapshot = transform(store.getState());

      return (next) => (action: A) => {
        const skip = this.listeners.length === 0;
        const res = next(action as any);
        let patch: boolean | Patch = [];

        //
        // check if we should perform a diff on the entire state
        //
        if (select(action)) {
          //
          // get the new state
          //
          const current = transform(store.getState());

          //
          // compare with previous snapshot. this can be expensive!
          //
          patch = !skip && compare(this.snapshot || {}, current as any);

          //
          // update the snapshot
          //
          this.snapshot = current;
        } else {
          //
          // otherwise, check if any of the registered streamers
          // want to produce action-specific patches.
          //
          this.options.streamers?.forEach((streamer) => {
            streamer(this.snapshot || {} as T, action, (op) => {
              if (op) {
                (patch as Patch).push(op);
              }
            });
          });

          //
          // if there are patches, then we should
          // update our snapshot as well.
          //
          if (patch && patch.length) {
            this.patchSnapshot(patch);
          }
        }

        //
        // notify listeners
        //
        if (patch && patch.length) {
          this.listeners.forEach((listener) => listener(patch as Patch));
        }

        return res;
      };
    };
  }

  updateSnapshot(state: T) {
    this.snapshot = state;
  }

  patchSnapshot(patch: Patch) {
    this.snapshot = applyPatch(this.snapshot || {}, patch).newDocument as T;
  }

  subscribe(listener: PatchListener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: PatchListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }
}
