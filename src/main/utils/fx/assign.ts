import { DeepPartial } from 'redux';

export const assign = <T extends { [key: string]: any }>(target: T, source?: DeepPartial<T>): T => {
  for (const key in source) {
    if (Array.isArray(source[key])) {
      target[key] = [...(source[key] as Array<T>)] as any;
    } else if (typeof source[key] === 'object') {
      if (source[key] == null) {
        target[key] = null as any;
      } else {
        target[key] = { ...target[key], ...assign(target[key], source[key]) };
      }
    } else if (source[key] !== undefined) {
      if (target === undefined) {
        target = {} as T;
      }
      target[key] = source[key] as T[Extract<keyof T, string>];
    }
  }

  return target;
};
