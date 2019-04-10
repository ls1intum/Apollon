import React, { AllHTMLAttributes } from 'react';
import { Omit } from 'react-redux';
import { Typography } from './typography-styles';

export const Header = (props: Omit<AllHTMLAttributes<HTMLElement>, 'as'>) => (
  <Typography variant="header" as="h1" {...props} />
);
