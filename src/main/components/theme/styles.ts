import baseStyled, {
  css as baseCss,
  ThemedCssFunction,
  ThemedStyledFunction,
  ThemedStyledInterface,
} from 'styled-components';

export { withTheme } from 'styled-components';

const apollonTheme = {
  color: {
    primary: 'var(--apollon-primary, #2a8fbd)',
    secondary: 'var(--apollon-secondary, #6c757d)',
    warningYellow: 'var(--apollon-warning-yellow, #ffc800)',
    background: 'var(--apollon-background, #ffffff)',
    backgroundVariant: 'var(--apollon-background-variant, #e5e5e5)',
    grid: 'var(--apollon-grid, rgba(36, 39, 36, 0.1))',
    primaryContrast: 'var(--apollon-primary-contrast, #212529)',
    gray: 'var(--apollon-gray, #e9ecef)',
    grayAccent: 'var(--apollon-gray-variant, #343a40)',
  },
  font: {
    color: 'var(--apollon-primary-contrast, #212529)',
    family: 'Helvetica Neue, Helvetica, Arial, sans-serif',
    size: 16,
  },
  interactive: {
    normal: 'rgba(0, 220, 0, 0.3)',
    hovered: 'rgba(0, 220, 0, 0.15)',
  },
};

export type Styles = typeof apollonTheme;

declare module 'styled-components' {
  // Ensure styled-components infers the Apollon theme without casting
  export interface DefaultTheme extends Styles {}
}

type StyledSvgHelpers = {
  polyline: ThemedStyledFunction<'polyline', Styles>;
  path: ThemedStyledFunction<'path', Styles>;
  rect: ThemedStyledFunction<'rect', Styles>;
  circle: ThemedStyledFunction<'circle', Styles>;
  ellipse: ThemedStyledFunction<'ellipse', Styles>;
  line: ThemedStyledFunction<'line', Styles>;
};

const svgHelpers: StyledSvgHelpers = {
  polyline: baseStyled('polyline'),
  path: baseStyled('path'),
  rect: baseStyled('rect'),
  circle: baseStyled('circle'),
  ellipse: baseStyled('ellipse'),
  line: baseStyled('line'),
};

export const styled: ThemedStyledInterface<Styles> & StyledSvgHelpers = Object.assign(baseStyled, svgHelpers);
export const css: ThemedCssFunction<Styles> = baseCss;

export type withThemeProps = { theme: Styles };

export type Color = 'primary' | 'secondary';
export type Size = 'sm' | 'md' | 'lg';

export const defaults = () => {
  return apollonTheme;
};
