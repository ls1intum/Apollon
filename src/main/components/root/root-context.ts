import { createContext } from 'react';

export type RootContext = {
  root: HTMLDivElement;
};

export const { Consumer: RootConsumer, Provider: RootProvider } = createContext<RootContext | null>(null);
