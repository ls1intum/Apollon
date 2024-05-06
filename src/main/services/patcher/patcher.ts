import { applyReducer } from 'fast-json-patch';
import { buffer, debounceTime, filter, map, merge, Observable, Subject, Subscription, throttleTime } from 'rxjs';

import { compare } from './compare';
import { Patch, PatchListener } from './patcher-types';
import { PatchVerifier, SignedPatch } from './patch-verifier';

/**
 * Compares two objects and returns the difference
 * in the form of a [JSON patch](http://jsonpatch.com/).
 */
export type Comparator<T> = (a: T, b: T) => Patch;

export interface PatcherOptions<T> {
  /**
   * Compares two objects and returns the difference
   * in the form of a [JSON patch](http://jsonpatch.com/).
   */
  diff: Comparator<T>;

  /**
   * The maximum frequency of continuous changes emitted by this patcher,
   * per second. Defaults to 25. This does not affect discrete changes.
   */
  maxFrequency: number;
}

const _DefaultOptions = {
  diff: compare,
  maxFrequency: 60,
};

/**
 * A patcher tracks changes to an object and notifies subscribers.
 * It also allows application of patches to the object.
 */
export class Patcher<T> {
  private _snapshot: T | undefined;
  private subscribers: { [key: number]: Subscription } = {};
  private discreteRouter = new Subject<Patch>();
  private continuousRouter = new Subject<Patch>();
  private continuousPatchObservable: Observable<Patch>;
  private observable: Observable<Patch>;
  private verifier = new PatchVerifier();
  readonly options: PatcherOptions<T>;

  /**
   * @param diff A function that compares two objects and returns the difference
   * in the form of a [JSON patch](http://jsonpatch.com/).
   */
  constructor(options: Partial<PatcherOptions<T>> = _DefaultOptions) {
    this.options = {
      diff: options.diff || _DefaultOptions.diff,
      maxFrequency: options.maxFrequency || _DefaultOptions.maxFrequency,
    };

    // TODO: Double check the correctness of this code.
    //       there are guard rails for handling multiple patches per tick
    //       or filtering out empty patches, but they are only
    //       applied to the total observable. If a consumer subscribes
    //       to discrete patches, for example, they won't get these
    //       guard rails. This is a potential bug.

    //
    // throttle continuous patches to handle back-pressure. note that
    // unlike discrete changes, it is ok to miss some continuous changes.
    //
    this.continuousPatchObservable = this.continuousRouter.pipe(throttleTime(1000 / this.options.maxFrequency));

    const router = merge(this.discreteRouter, this.continuousPatchObservable);

    //
    // we might get multiple patches in a single tick,
    // for example due to some side effects of some patches being applied.
    // to avoid backpressure, we buffer the patches and emit them all at once.
    //
    this.observable = router.pipe(
      buffer(router.pipe(debounceTime(0))),
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
    this.checkAndUpdate(nextState);
  }

  /**
   * Updates its snapshots, checks for continuous changes and notifies subscribers.
   * Continuous changes are changes that happen frequently, such as mouse movement,
   * and are ok to miss a few.
   * @param nextState The next state of the object.
   */
  checkContinuous(nextState: T): void {
    this.checkAndUpdate(nextState, false);
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
   * @returns The whether the state should change, and the new state of the object.
   */
  patch(patch: Patch | SignedPatch, state?: T): { patched: boolean; result: T } {
    this.validate();

    const verified = this.verifier.verified(patch);
    this._snapshot = state ?? this._snapshot;

    if (verified && verified.length > 0) {
      this._snapshot = verified.reduce((state, p, index) => {
        try {
          return applyReducer(state, p, index);
        } catch {
          return state;
        }
      }, this.snapshot);

      return { patched: true, result: this.snapshot };
    }

    return { patched: false, result: this.snapshot };
  }

  /**
   * Subscribes to changes to the object.
   * @param listener A function that will be called when the object changes.
   * @returns A subscription ID that can be used to unsubscribe.
   */
  subscribe(listener?: PatchListener): number {
    const key = this.nextKey();
    this.subscribers[key] = this.observable.subscribe(listener);

    return key;
  }

  /**
   * Subscribes to discrete changes to the object. Discrete changes are changes
   * that happen infrequently, such as a button click, and should not be missed.
   * @param listener A function that will be called when the object changes.
   * @returns A subscription ID that can be used to unsubscribe.
   */
  subscribeToDiscreteChanges(listener: PatchListener): number {
    const key = this.nextKey();
    this.subscribers[key] = this.discreteRouter.subscribe(listener);

    return key;
  }

  /**
   * Subscribes to continuous changes to the object. Continuous changes are changes
   * that happen frequently, such as mouse movement, and are ok to miss a few.
   * @param listener A function that will be called when the object changes.
   * @returns A subscription ID that can be used to unsubscribe.
   */
  subscribeToContinuousChanges(listener: PatchListener): number {
    const key = this.nextKey();
    this.subscribers[key] = this.continuousPatchObservable.subscribe(listener);

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

  // checks for changes and notifies subscribers, using given router
  private checkAndUpdate(nextState: T, discreteChange = true): void {
    this.validate();

    const skip = Object.keys(this.subscribers).length === 0;
    const patch = !skip && this.options.diff(this.snapshot, nextState);
    if (discreteChange) {
      this._snapshot = nextState;
    }

    if (patch && patch.length) {
      const router = discreteChange ? this.discreteRouter : this.continuousRouter;
      router.next(this.verifier.sign(patch));
    }
  }

  // generates a unique key for a subscription
  private nextKey() {
    return Math.max(...Object.keys(this.subscribers).map((k) => parseInt(k, 10)), 0) + 1;
  }

  // throws if patcher is not initialized
  private validate(): asserts this is { snapshot: T } {
    if (!this.snapshot) {
      throw new Error('Patcher not initialized');
    }
  }
}
