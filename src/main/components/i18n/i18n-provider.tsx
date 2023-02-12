import React, { Component } from 'react';
import de from '../../i18n/de.json';
import en from '../../i18n/en.json';
import { Locale } from '../../services/editor/editor-types';
import { I18nContext, I18nProvider as Provider } from './i18n-context';

const defaultLocale = Locale.en;

type Props = {
  locale: Locale;
  children?: React.ReactNode;
};

const dictionary: { [key in Locale]: object } = {
  [Locale.de]: de,
  [Locale.en]: en,
};

export class I18nProvider extends Component<Props> {
  static defaultProps = {
    locale: defaultLocale,
  };

  render() {
    const value: I18nContext = {
      translate: this.translate,
    };
    return <Provider value={value}>{this.props.children}</Provider>;
  }

  private translate = (key: string): string => {
    try {
      let translations = dictionary[this.props.locale];
      let translation: string = key.split('.').reduce((result, current) => result[current], translations as any);
      if (!translation) {
        translations = dictionary[defaultLocale];
        translation = key.split('.').reduce((result, current) => result[current], translations as any);
      }
      return translation;
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.error(error);
      return '';
    }
  };
}
