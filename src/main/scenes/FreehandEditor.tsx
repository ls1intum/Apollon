import React from 'react';
import { DeepPartial } from 'redux';
import { I18nProvider } from '../components/i18n/i18n-provider';
import { Theme } from '../components/theme/theme';
import { Styles, Locale } from '../typings';
import { Layout } from './application-styles';
import { FreehandCanvas } from '../components/drawable-canvas/FreehandCanvas';

type Props = {
  styles?: DeepPartial<Styles>;
  locale?: Locale;
};

export const FreehandEditor = (props: Props) => {
  return (
    <I18nProvider locale={props.locale}>
      <Theme styles={props.styles} scale={1.0}>
        <Layout className="apollon-editor">
          <FreehandCanvas />
        </Layout>
      </Theme>
    </I18nProvider>
  );
};
