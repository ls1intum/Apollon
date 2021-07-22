import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { I18nProvider } from '../src/main/components/i18n/i18n-provider';
import { defaults } from '../src/main/components/theme/styles';
import { Style } from '../src/main/scenes/svg-styles';
import { getRealStore } from '../src/tests/test-utils/test-utils';
import { Locale } from '../src/main';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  argTypes: { isSvg: { table: { disable: true } } },
};

export const decorators = [
  (Story, context) =>
    context.args.isSvg ? (
      <svg
        width={200}
        height={100}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        fill="white"
      >
        <defs>
          <style>{Style[0]({ theme: defaults(1.0) })}</style>
        </defs>
        <Story />
      </svg>
    ) : (
      <Story />
    ),
  (Story) => (
    <ThemeProvider theme={defaults(1.0)}>
      <Story />
    </ThemeProvider>
  ),
  (Story) => (
    <I18nProvider locale={Locale.en}>
      <Story />
    </I18nProvider>
  ),
  (Story) => (
    <Provider store={getRealStore()}>
      <Story />
    </Provider>
  ),
];
