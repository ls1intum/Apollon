import { ButtonHTMLAttributes, createElement, forwardRef, ReactNode } from 'react';
import { Color, Size } from '../../theme/styles';
import { StyledButton } from './button-styles';

export const defaultProps = Object.freeze({
  block: false as boolean,
  color: 'secondary' as Color | 'link',
  disabled: false as boolean,
  outline: false as boolean,
  size: 'sm' as Size,
});

export type Props = { children?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement> & Partial<typeof defaultProps>;

export const Button = forwardRef<HTMLButtonElement, Props>((props, ref) =>
  createElement(StyledButton, { ...props, ref }),
);

Button.defaultProps = defaultProps;
