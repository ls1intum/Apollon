import React, { SVGAttributes } from 'react';

type Props = SVGAttributes<SVGSVGElement>;

export const Icon = (props: Props) => (
  <svg width="16px" height="16px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props} />
);
