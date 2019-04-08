import { ReactNode } from 'react';

export type Props<T> = {
  value: T;
  children: ReactNode;
};

export const SwitchItem = <T>(props: Props<T>) => null;
