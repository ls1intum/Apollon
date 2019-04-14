import { DeepPartial } from 'redux';

export const update = <T extends object>(target: T, source: DeepPartial<T>): T => {
  let clone: T = { ...target };

  for (let [key, value] of Object.entries(source)) {
    if (value instanceof Object) {
      value = update((clone as any)[key], value);
    }
    clone = { ...clone, [key]: value };
  }

  return clone;
};
