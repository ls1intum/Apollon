import { DeepPartial } from 'redux';

type update = <T extends object>(target: T, source: DeepPartial<T>) => T;

export const update: update = <T extends object>(target: T, source: DeepPartial<T>): T => {
  let clone: T = { ...target };

  for (let [key, value] of Object.entries(source)) {
    if (value instanceof Object) {
      value = update((clone as any)[key], value as any);
    }
    clone = { ...clone, [key]: value };
  }

  return clone;
};
