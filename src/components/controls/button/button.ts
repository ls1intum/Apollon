import { ButtonHTMLAttributes, createElement, ReactNode } from 'react';
import { Color, Size } from '../../theme/styles';
import { StyledButton } from './button-styles';

export const defaultProps = Object.freeze({
  block: false,
  color: 'secondary' as Color | 'link',
  disabled: false,
  outline: false,
  size: 'sm' as Size,
});

type Props = { children?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement> & typeof defaultProps;

export const Button = (props: Props) => createElement(StyledButton, props);

Button.defaultProps = defaultProps;
