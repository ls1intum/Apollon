import { createContext } from 'react';

export type RootContext = {
  layout: HTMLDivElement;
};

export const { Consumer: RootConsumer, Provider: RootProvider } = createContext<RootContext | null>(null);
