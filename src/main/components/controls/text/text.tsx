import React from 'react';

type Props = {
  children: React.ReactNode;
  fill?: string;
  x?: string | number;
  y?: string | number;
  dominantBaseline?:
    | 'alphabetic'
    | 'hanging'
    | 'ideographic'
    | 'mathematical'
    | 'auto'
    | 'text-before-edge'
    | 'middle'
    | 'central'
    | 'text-after-edge'
    | 'inherit'
    | 'use-script'
    | 'no-change'
    | 'reset-size'
    | undefined;
  textAnchor?: 'end' | 'start' | 'middle' | 'inherit' | undefined;
  fontWeight?: string;
  pointerEvents?: string;
  noX?: boolean;
  noY?: boolean;
};

export const Text: React.FC<Props & Record<string, any>> = ({
  children,
  fill,
  x = '50%',
  y = '50%',
  dominantBaseline = 'middle',
  textAnchor = 'middle',
  fontWeight = 'bold',
  pointerEvents = 'none',
  noX = false,
  noY = false,
  ...props
}: Props) => {
  const pos: { x?: string | number; y?: string | number } = {};
  if (!noX) {
    pos.x = x;
  }
  if (!noY) {
    pos.y = y;
  }
  return (
    <text
      {...pos}
      style={fill ? { fill } : {}}
      dominantBaseline={dominantBaseline}
      textAnchor={textAnchor}
      fontWeight={fontWeight}
      pointerEvents={pointerEvents}
      {...props}
    >
      {children}
    </text>
  );
};
