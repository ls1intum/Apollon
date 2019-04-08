import { createElement, DOMAttributes, ReactNode } from 'react';
import { Color, Size } from '../../theme/styles';
import { StyledButton } from './button-styles';

const defaultProps = Object.freeze({
  block: false,
  color: 'secondary' as Color,
  disabled: false,
  outline: false,
  size: 'md' as Size,
});

export type Props = { children?: ReactNode } & DOMAttributes<HTMLButtonElement> & typeof defaultProps;

export const Button = (props: Props) => createElement(StyledButton, props);

Button.defaultProps = defaultProps;
