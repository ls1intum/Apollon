import React, { HTMLAttributes } from 'react';
import { Typography } from './typography-styles';

export const Header = (props: HTMLAttributes<HTMLElement>) => <Typography variant="header" as="h1" {...props} />;
