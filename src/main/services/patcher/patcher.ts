import { applyReducer } from 'fast-json-patch';
import { Observable, Subject, Subscription, buffer, debounceTime, map, filter } from 'rxjs';

import { compare } from './compare';
import { Patch, PatchListener } from './patcher-types';

/**
 * Compares two objects and returns the difference
 * in the form of a [JSON patch](http://jsonpatch.com/).
 */
export type Comparator<T> = (a: T, b: T) => Patch;

/**
 * A patcher tracks changes to an object and notifies subscribers.
 * It also allows application of patches to the object.
 */
export class Patcher<T> {
  private _snapshot: T | undefined;
  private subscribers: { [key: number]: Subscription } = {};
  private router = new Subject<Patch>();
  private observable: Observable<Patch>;

  /**
   * @param diff A function that compares two objects and returns the difference
   * in the form of a [JSON patch](http://jsonpatch.com/).
   */
  constructor(readonly diff: Comparator<T> = compare as Comparator<T>) {
    this.observable = this.router.pipe(
      buffer(this.router.pipe(debounceTime(0))),
      map((patches) => patches.flat()),
      filter((patches) => patches.length > 0),
    );
  }

  /**
   * @returns The current state of the object.
   */
  get snapshot(): T | undefined {
    return this._snapshot;
  }

  /**
   * Updates its snapshots, checks for changes and notifies subscribers.
   * @param nextState The next state of the object.
   */
  check(nextState: T): void {
    this.validate();

    const skip = Object.keys(this.subscribers).length === 0;
    const patch = !skip && this.diff(this.snapshot, nextState);
    this._snapshot = nextState;

    if (patch && patch.length) {
      this.router.next(patch);
    }
  }

  /**
   * Initializes the patcher with the initial state of the object.
   * @param state The initial state of the object.
   */
  initialize(state: T): void {
    this._snapshot = state;
  }

  /**
   * Applies a patch to the object. Will NOT notify subscribers.
   * @param patch The patch to apply.
   * @returns The new state of the object.
   */
  patch(patch: Patch): T {
    this.validate();

    if (patch && patch.length > 0) {
      this._snapshot = patch.reduce((state, p, index) => {
        try {
          return applyReducer(state, p, index);
        } catch {
          return state;
        }
      }, this.snapshot);
    }

    return this.snapshot;
  }

  /**
   * Subscribes to changes to the object.
   * @param listener A function that will be called when the object changes.
   * @returns A subscription ID that can be used to unsubscribe.
   */
  subscribe(listener: PatchListener): number {
    const key = this.nextKey();
    this.subscribers[key] = this.observable.subscribe(listener);

    return key;
  }

  /**
   * Unsubscribes from changes to the object.
   * @param subscriptionId The subscription ID returned by `subscribe`.
   */
  unsubscribe(subscriptionId: number): void {
    this.subscribers[subscriptionId].unsubscribe();
    delete this.subscribers[subscriptionId];
  }

  private nextKey() {
    return Math.max(...Object.keys(this.subscribers).map((k) => parseInt(k, 10)), 0) + 1;
  }

  private validate(): asserts this is { snapshot: T } {
    if (!this.snapshot) {
      throw new Error('Patcher not initialized');
    }
  }
}
