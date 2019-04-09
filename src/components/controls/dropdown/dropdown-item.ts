import { ReactNode } from 'react';

export type Props<T> = {
  children: ReactNode;
  value: T;
};

export const DropdownItem = <T>(props: Props<T>) => null;
