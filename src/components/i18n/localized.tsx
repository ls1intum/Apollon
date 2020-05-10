import React, { ComponentType } from 'react';
import { I18nConsumer, I18nContext } from './i18n-context';

export const localized = <P extends I18nContext>(Component: ComponentType<P>) => {
  // Localized Component
  return (props: Pick<P, Exclude<keyof P, keyof I18nContext>>) => {
    return <I18nConsumer>{i18n => <Component {...(props as P)} {...i18n} />}</I18nConsumer>;
  };
};
