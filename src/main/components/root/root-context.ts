import { createContext } from 'react';

export type RootContext = {
  root: HTMLDivElement;
  children?: React.ReactNode;
};

export const { Consumer: RootConsumer, Provider: RootProvider } = createContext<RootContext | null>(null);
