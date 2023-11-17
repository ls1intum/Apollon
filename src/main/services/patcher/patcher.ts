import { applyReducer } from 'fast-json-patch';
import { Observable, Subject, Subscription, buffer, debounceTime, map, filter } from 'rxjs';

import { compare } from './compare';
import { Patch, PatchListener } from './patcher-types';

export type Comparator<T> = (a: T, b: T) => Patch;

export class Patcher<T> {
  private _snapshot: T | undefined;
  private subscribers: { [key: number]: Subscription } = {};
  private router = new Subject<Patch>();
  private observable: Observable<Patch>;

  constructor(readonly diff: Comparator<T> = compare as Comparator<T>) {
    this.observable = this.router.pipe(
      buffer(this.router.pipe(debounceTime(0))),
      map((patches) => patches.flat()),
      filter((patches) => patches.length > 0),
    );
  }

  get snapshot(): T | undefined {
    return this._snapshot;
  }

  check(nextState: T): void {
    this.validate();

    const skip = Object.keys(this.subscribers).length === 0;
    const patch = !skip && this.diff(this.snapshot, nextState);
    this._snapshot = nextState;

    if (patch && patch.length) {
      this.router.next(patch);
    }
  }

  initialize(state: T): void {
    this._snapshot = state;
  }

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

  subscribe(listener: PatchListener): number {
    const key = this.nextKey();
    this.subscribers[key] = this.observable.subscribe(listener);

    return key;
  }

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
