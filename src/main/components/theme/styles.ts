import baseStyled, { css as baseCss, ThemedCssFunction, ThemedStyledInterface } from 'styled-components';

export { withTheme } from 'styled-components';

export type Styles = typeof apollonTheme;

const resolvedStyled = ((baseStyled as unknown as { default?: unknown }).default ?? baseStyled) as ThemedStyledInterface<Styles>;

const styledProxy = new Proxy(resolvedStyled, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target as unknown as (...args: unknown[]) => unknown, thisArg, argArray);
  },
  get(target, prop, receiver) {
    const existing = Reflect.get(target, prop, receiver);
    if (existing !== undefined) {
      return existing;
    }

    if (typeof prop === 'string') {
      const helper = (target as unknown as (tag: string) => unknown)(prop);
      Reflect.set(target, prop, helper, receiver);
      return helper;
    }

    return existing;
  },
});

export const styled = styledProxy as ThemedStyledInterface<Styles>;
export const css = baseCss as ThemedCssFunction<Styles>;

export type withThemeProps = { theme: Styles };

export type Color = 'primary' | 'secondary';
export type Size = 'sm' | 'md' | 'lg';

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

export const defaults = () => {
  return apollonTheme;
};
