import { compare, applyPatch } from 'fast-json-patch';
import { Patch, PatchListener } from './patcher-types';


export class Patcher<T> {
  private snapshot?: T;
  private listeners: PatchListener[] = [];

  check(nextState: T) {
    const skip = this.listeners.length === 0;
    const patch = !skip && compare(this.snapshot || {}, nextState as any);
    this.snapshot = nextState;

    if (patch && patch.length) {
      this.listeners.forEach((listener) => listener(patch as Patch));
    }
  }

  initialize(state: T) {
    this.snapshot = state;
  }

  patch(patch: Patch) {
    this.snapshot = applyPatch(this.snapshot || {}, patch).newDocument as T;

    return this.snapshot;
  }

  subscribe(listener: PatchListener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: PatchListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }
}
