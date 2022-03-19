import baseStyled, { css as baseCss, ThemedCssFunction, ThemedStyledInterface } from 'styled-components';
export { withTheme } from 'styled-components';

export type Styles = typeof apollonTheme;

export const styled = baseStyled as ThemedStyledInterface<Styles>;
export const css = baseCss as ThemedCssFunction<Styles>;

export type withThemeProps = { theme: Styles };

export type Color = 'primary' | 'secondary';
export type Size = 'sm' | 'md' | 'lg';

const apollonTheme = {
  color: {
    primary: 'var(--primary)',
    secondary: 'var(--secondary)',
    warningYellow: 'var(--warning-yellow)',
    background: 'var(--background)',
    backgroundVariant: 'var(--background-variant)',
    primaryContrast: 'var(--primary-contrast)',
    gray: 'var(--gray)',
    grayAccent: 'var(--gray-variant)',
  },
  font: {
    color: 'var(--primary-contrast)',
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
    ...apollonTheme,
    font: { ...apollonTheme.font, size: apollonTheme.font.size * scale },
  };
};
