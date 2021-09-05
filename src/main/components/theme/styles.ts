import baseStyled, { css as baseCss, ThemedCssFunction, ThemedStyledInterface } from 'styled-components';
export { withTheme } from 'styled-components';

export type Styles = typeof unscaledDefaults;

export const styled = baseStyled as ThemedStyledInterface<Styles>;
export const css = baseCss as ThemedCssFunction<Styles>;

export type withThemeProps = { theme: Styles };

export type Color = 'primary' | 'secondary';
export type Size = 'sm' | 'md' | 'lg';

const unscaledDefaults = {
  color: {
    primary: '#2a8fbd',
    secondary: '#6c757d',
    white: '#fff',
    gray100: '#f8f9fa',
    gray200: '#e9ecef',
    gray300: '#dee2e6',
    gray400: '#ced4da',
    gray500: '#adb5bd',
    gray600: '#6c757d',
    gray700: '#495057',
    gray800: '#343a40',
    gray900: '#212529',
    black: '#212529',
  },
  font: {
    color: '#212529',
    family: 'Helvetica Neue, Helvetica, Arial, sans-serif',
    size: 16,
  },
  interactive: {
    normal: 'rgba(0, 220, 0, 0.3)',
    hovered: 'rgba(0, 220, 0, 0.15)',
  },
};

export const defaults = (scale: number = 1.0) => {
  return {
    ...unscaledDefaults,
    font: { ...unscaledDefaults.font, size: unscaledDefaults.font.size * scale },
  };
};
