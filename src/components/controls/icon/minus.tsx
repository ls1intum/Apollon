import React, { SVGAttributes } from 'react';
import { Icon } from './icon';

type Props = SVGAttributes<SVGSVGElement>;

export const MinusIcon = (props: Props) => (
  <Icon viewBox="0 0 384 512" {...props}>
    <path d="M376 232H8c-4.42 0-8 3.58-8 8v32c0 4.42 3.58 8 8 8h368c4.42 0 8-3.58 8-8v-32c0-4.42-3.58-8-8-8z" />
  </Icon>
);
