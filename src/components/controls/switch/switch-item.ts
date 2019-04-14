import { ReactNode } from 'react';

export type Props<T> = {
  children: ReactNode;
  value: T;
};

export const SwitchItem = <T>(props: Props<T>) => null;
