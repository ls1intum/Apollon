import { DeepPartial } from 'redux';

export const assign = <T extends { [key: string]: any }>(target: T, source?: DeepPartial<T>): T => {
  for (const key in source) {
    if (typeof source[key] === 'object') {
      target[key] = { ...target[key], ...assign(target[key], source[key]) };
    } else if (source[key]) {
      target[key] = source[key] as T[Extract<keyof T, string>];
    }
  }

  return target;
};
