import baseStyled, { css as baseCss, ThemedCssFunction, ThemedStyledInterface } from 'styled-components';

export type Styles = typeof defaults;

export const styled = baseStyled as ThemedStyledInterface<Styles>;
export const css = baseCss as ThemedCssFunction<Styles>;

export type Color = 'primary' | 'secondary';
export type Size = 'sm' | 'md' | 'lg';

export const defaults = {
  color: {
    primary: '#007bff',
    secondary: '#6c757d',
    white: '#fff',
    lightgray: '#f8f9fa',
    black: '#212529',
  },
  font: {
    color: '#212529',
  },
  primaryColor: '#2A8FBD',
  borderColor: '#AAAAAA',
  highlightColor: 'rgba(0, 100, 255, 0.21)',
  highlightColorDarker: 'rgba(0, 100, 255, 0.6)',
  highlightBorderColor: 'rgba(0, 100, 255, 0.6)',
  interactiveAreaColor: 'rgba(0, 220, 0, 0.3)',
  interactiveAreaHoverColor: 'rgba(0, 220, 0, 0.15)',
  fontFamily: 'HelveticaNeue, Helvetica, Arial, Verdana, sans-serif',
  headingFontFamily: 'HelveticaNeue-Light, Helvetica, Arial, Verdana, sans-serif',
  headingFontWeight: 300,
};
