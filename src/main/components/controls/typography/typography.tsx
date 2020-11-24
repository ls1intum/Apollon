import React, { HTMLAttributes } from 'react';
import { Typography } from './typography-styles';

export const defaultProps = {
  gutter: true,
};

type Props = typeof defaultProps & HTMLAttributes<HTMLParagraphElement>;

export const Header = (props: Props) => <Typography variant="header" as="h1" {...props} />;

Header.defaultProps = defaultProps;

export const Body = (props: Props) => {
  const { gutter, ...typographyProps } = props;
  return <Typography variant="body" as="span" gutter={false} {...typographyProps} />;
};

Body.defaultProps = {
  gutter: false,
};
