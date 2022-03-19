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
    primary: 'var(--apollon-primary)',
    secondary: 'var(--apollon-secondary)',
    warningYellow: 'var(--apollon-warning-yellow)',
    background: 'var(--apollon-background)',
    backgroundVariant: 'var(--apollon-background-variant)',
    primaryContrast: 'var(--apollon-primary-contrast)',
    gray: 'var(--apollon-gray)',
    grayAccent: 'var(--apollon-gray-variant)',
  },
  font: {
    color: 'var(--apollon-primary-contrast)',
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
