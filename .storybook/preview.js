import { ThemeProvider } from 'styled-components';
import { defaults } from '../src/main/components/theme/styles';
import { Style } from '../src/main/scenes/svg-styles';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  argTypes: { isSvg: { table: { disable: true } } },
};

export const decorators = [
  (Story, context) =>
    context.args.isSvg ? (
      <svg
        width={500}
        height={500}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        fillOpacity={0}
        fill="white"
      >
        <defs>
          <style>{Style[0]({ theme: defaults })}</style>
        </defs>
        <Story />
      </svg>
    ) : (
      <Story />
    ),
  (Story) => (
    <ThemeProvider theme={defaults}>
      <Story />
    </ThemeProvider>
  ),
];
