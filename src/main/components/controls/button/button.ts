import { ButtonHTMLAttributes, createElement, forwardRef, ReactNode } from 'react';
import { Color, Size } from '../../theme/styles.js';
import { StyledButton } from './button-styles.js';

export const defaultProps = Object.freeze({
  block: false,
  color: 'secondary' as Color | 'link',
  disabled: false,
  outline: false,
  size: 'sm' as Size,
});

export type Props = { children?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement> & Partial<typeof defaultProps>;

export const Button = forwardRef<HTMLButtonElement, Props>((props, ref) =>
  createElement(StyledButton, { ...props, ref }),
);

Button.defaultProps = defaultProps;
