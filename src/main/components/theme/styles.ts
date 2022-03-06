import baseStyled, { css as baseCss, ThemedCssFunction, ThemedStyledInterface } from 'styled-components';
export { withTheme } from 'styled-components';

export type Styles = typeof apollonLight | typeof apollonDark;

export const styled = baseStyled as ThemedStyledInterface<Styles>;
export const css = baseCss as ThemedCssFunction<Styles>;

export type withThemeProps = { theme: Styles };

export type Color = 'primary' | 'secondary';
export type Size = 'sm' | 'md' | 'lg';

const apollonLight = {
  color: {
    primary: '#2a8fbd',
    secondary: '#6c757d',
    warningYellow: '#ffc800',
    background: '#ffffff',
    backgroundVariant: '#e5e5e5',
    primaryContrast: '#212529',
    gray: '#e9ecef',
    grayAccent: '#212529',
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

const apollonDark = {
  color: {
    primary: '#4269a0',
    secondary: '#6f85c2',
    warningYellow: '#ffc800',
    background: '#1B2121',
    backgroundVariant: '#9BB5BB',
    primaryContrast: '#faf8f8',
    gray: '#343a40',
    grayAccent: '#6c757d',
    gray900: '#f8f9fa',
    gray800: '#e9ecef',
    gray700: '#dee2e6',
    gray600: '#ced4da',
    gray500: '#adb5bd',
    gray400: '#6c757d',
    gray300: '#495057',
    gray200: '#343a40',
    gray100: '#212529',
  },
  font: {
    color: '#faf8f8',
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
    ...apollonDark,
    font: { ...apollonDark.font, size: apollonDark.font.size * scale },
  };
};
