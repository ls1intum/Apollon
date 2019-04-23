import React, { Component } from 'react';
import de from '../../i18n/de.json';
import en from '../../i18n/en.json';
import zh from '../../i18n/zh.json';
import { Locale } from '../../typings';
import { I18nContext, I18nProvider as Provider } from './i18n-context';

const defaultLocale = Locale.en;

type Props = {
  locale: Locale;
};

const dictionary: { [key in Locale]: object } = {
  [Locale.de]: de,
  [Locale.en]: en,
  [Locale.zh]: zh
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
      return '';
    }
  };
}
