import { createContext } from 'react';

export type I18nContext = {
  translate: (key: string) => string;
};

export const { Provider: I18nProvider, Consumer: I18nConsumer } = createContext<I18nContext | null>(null);
