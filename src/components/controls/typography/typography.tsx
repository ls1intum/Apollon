import React, { HTMLAttributes } from 'react';
import { Typography } from './typography-styles';

export const defaultProps = {
  gutter: true,
};

type Props = typeof defaultProps & HTMLAttributes<HTMLElement>;

export const Header = (props: Props) => <Typography variant="header" as="h1" {...props} />;

Header.defaultProps = defaultProps;

export const Body = (props: Props) => <Typography variant="body" as="span" {...props} />;

Body.defaultProps = defaultProps;
